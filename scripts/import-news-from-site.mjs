import process from "node:process";
import { PrismaClient, PublishStatus } from "@prisma/client";

const prisma = new PrismaClient();

const SITE_URL = "https://tokyo-league.jp";
const POSTS_API = `${SITE_URL}/wp-json/wp/v2/posts`;

const owner = await prisma.user.findFirst({
  where: { role: "OWNER" },
  orderBy: { createdAt: "asc" },
});

if (!owner) {
  console.error("Owner user not found.");
  process.exit(1);
}

const newsCategory = await prisma.newsCategory.upsert({
  where: { slug: "notice" },
  update: { name: "お知らせ", sortOrder: 0 },
  create: { name: "お知らせ", slug: "notice", sortOrder: 0 },
});

const posts = await fetchPaginatedJson(
  `${POSTS_API}?per_page=100&_fields=id,date,slug,link,title,excerpt,content,categories`,
);

let count = 0;

for (const post of posts) {
  const title = sanitizeText(post.title?.rendered ?? "");
  const body = htmlToPlainText(post.content?.rendered ?? "");
  const excerpt = htmlToPlainText(post.excerpt?.rendered ?? "").slice(0, 240);

  if (!title || !body) {
    continue;
  }

  await prisma.newsPost.upsert({
    where: { slug: `news-${post.id}` },
    update: {
      title,
      excerpt: excerpt || null,
      body,
      categoryId: newsCategory.id,
      status: PublishStatus.PUBLISHED,
      publishedAt: new Date(post.date),
      updatedById: owner.id,
    },
    create: {
      slug: `news-${post.id}`,
      title,
      excerpt: excerpt || null,
      body,
      categoryId: newsCategory.id,
      status: PublishStatus.PUBLISHED,
      publishedAt: new Date(post.date),
      createdById: owner.id,
      updatedById: owner.id,
    },
  });

  count += 1;
}

console.log(JSON.stringify({ importedNews: count }, null, 2));

await prisma.$disconnect();

async function fetchPaginatedJson(baseUrl) {
  const items = [];
  let page = 1;

  while (true) {
    const url = `${baseUrl}&page=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        break;
      }

      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    items.push(...data);
    page += 1;
  }

  return items;
}

function sanitizeText(value) {
  return decodeHtmlEntities(stripTags(value))
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToPlainText(value) {
  return decodeHtmlEntities(
    value
      .replace(/<\/p>/g, "\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<\/li>/g, "\n")
      .replace(/<li>/g, "・"),
  )
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(value) {
  return String(value).replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#8217;/g, "’")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
