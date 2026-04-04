#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

import cv2
from rapidocr_onnxruntime import RapidOCR


engine = RapidOCR()


def cluster(values, gap=4):
    groups = []
    current = []
    for value in values:
        if not current or value - current[-1] <= gap:
            current.append(value)
        else:
            groups.append(int(sum(current) / len(current)))
            current = [value]
    if current:
        groups.append(int(sum(current) / len(current)))
    return groups


def detect_grid(image):
    height, width = image.shape[:2]
    x0 = int(width * 0.06)
    x1 = int(width * 0.95)
    y0 = int(height * 0.18)
    y1 = int(height * 0.99)
    crop = image[y0:y1, x0:x1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    th = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15,
        5,
    )

    vertical = cv2.morphologyEx(
        th,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15)),
    )
    horizontal = cv2.morphologyEx(
        th,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1)),
    )

    x_values = cluster(
        [i for i, value in enumerate(vertical.sum(axis=0)) if value > vertical.sum(axis=0).max() * 0.15]
    )
    y_values = cluster(
        [i for i, value in enumerate(horizontal.sum(axis=1)) if value > horizontal.sum(axis=1).max() * 0.15]
    )

    if len(x_values) >= 2 and x_values[-1] - x_values[-2] < 12:
        x_values = x_values[:-1]
    if len(y_values) >= 2 and y_values[-1] - y_values[-2] < 12:
        y_values = y_values[:-1]

    return crop, x_values, y_values


def ocr_text(image):
    if image.size == 0:
        return ""
    enlarged = cv2.resize(image, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    result, _ = engine(enlarged)
    if not result:
        return ""
    text = " ".join(item[1] for item in result)
    return (
        text.replace("一", "-")
        .replace("ー", "-")
        .replace("—", "-")
        .replace("−", "-")
        .replace("O", "0")
        .replace("o", "0")
        .replace("△", "")
        .replace("?", "")
        .replace("®", "")
        .strip()
    )


def normalize_token(text):
    return (
        text.replace("一", "-")
        .replace("ー", "-")
        .replace("—", "-")
        .replace("−", "-")
        .replace("O", "0")
        .replace("o", "0")
        .replace("△", "")
        .replace("?", "")
        .replace("®", "")
        .strip()
    )


def parse_score(text):
    numbers = re.findall(r"\d+", text)
    if len(numbers) >= 2:
        return int(numbers[0]), int(numbers[1])
    return None


def parse_int(text):
    numbers = re.findall(r"-?\d+", text)
    return int(numbers[0]) if numbers else None


def parse_job(job):
    image_path = Path(job["imagePath"])
    teams = job["teams"]
    image = cv2.imread(str(image_path))

    if image is None:
        return {"ok": False, "error": f"image not found: {image_path}"}

    crop, xs, ys = detect_grid(image)
    team_count = len(teams)
    expected_x_count = team_count + 13
    expected_y_count = team_count + 2

    if len(xs) < expected_x_count or len(ys) < expected_y_count:
        return {
            "ok": False,
            "error": f"grid detection failed: x={len(xs)} y={len(ys)} expected_x={expected_x_count} expected_y={expected_y_count}",
            "xs": xs,
            "ys": ys,
        }

    full_ocr_result, _ = engine(crop)
    observations = []
    for item in full_ocr_result or []:
        box, text, _ = item
        xs_box = [point[0] for point in box]
        ys_box = [point[1] for point in box]
        observations.append(
            {
                "x": sum(xs_box) / len(xs_box),
                "y": sum(ys_box) / len(ys_box),
                "text": normalize_token(text),
            }
        )

    def cell_text(left, right, top, bottom):
        tokens = [
            item for item in observations if left <= item["x"] <= right and top <= item["y"] <= bottom and item["text"]
        ]
        tokens.sort(key=lambda item: (item["y"], item["x"]))
        return " ".join(item["text"] for item in tokens)

    matches = []
    for row_index in range(team_count):
        for col_index in range(row_index + 1, team_count):
            left = xs[2 + col_index]
            right = xs[3 + col_index]
            top = ys[1 + row_index]
            bottom = ys[2 + row_index]
            score = parse_score(cell_text(left, right, top, bottom))

            if score is None:
                score = parse_score(ocr_text(crop[top:bottom, left:right]))

            if score is None:
                left = xs[2 + row_index]
                right = xs[3 + row_index]
                top = ys[1 + col_index]
                bottom = ys[2 + col_index]
                reverse_score = parse_score(cell_text(left, right, top, bottom))
                if reverse_score is None:
                    reverse_score = parse_score(ocr_text(crop[top:bottom, left:right]))
                if reverse_score is not None:
                    score = (reverse_score[1], reverse_score[0])

            if score is None:
                continue

            matches.append(
                {
                    "homeTeamName": teams[row_index],
                    "awayTeamName": teams[col_index],
                    "homeScore": score[0],
                    "awayScore": score[1],
                }
            )

    standings = []
    for row_index in range(team_count):
        top = ys[1 + row_index]
        bottom = ys[2 + row_index]
        values = []
        for stat_index in range(10):
            left = xs[2 + team_count + stat_index]
            right = xs[3 + team_count + stat_index]
            value = parse_int(cell_text(left, right, top, bottom))
            if value is None:
                value = parse_int(ocr_text(crop[top:bottom, left:right]))
            values.append(value)

        standings.append(
            {
                "teamName": teams[row_index],
                "played": values[0] or 0,
                "remaining": values[1] or 0,
                "won": values[2] or 0,
                "lost": values[3] or 0,
                "drawn": values[4] or 0,
                "points": values[5] or 0,
                "goalsFor": values[6] or 0,
                "goalsAgainst": values[7] or 0,
                "goalDifference": values[8] or 0,
                "rank": values[9] or row_index + 1,
            }
        )

    return {
        "ok": True,
        "matches": matches,
        "standings": standings,
        "grid": {"xs": xs, "ys": ys},
    }


def main():
    payload = json.loads(Path(sys.argv[1]).read_text())
    output = []
    for job in payload:
      output.append(
          {
              "divisionId": job["divisionId"],
              "imagePath": job["imagePath"],
              "result": parse_job(job),
          }
      )
    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
