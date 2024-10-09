import { apikey, sequence_id, showBrowser } from "./config";
import { browser } from "@crawlora/browser";
export interface IArticle {
  source: string,
  title: string,
  link: string,
  date: string,
  image: string
}

export default async function ({
  searches, // data coming from textarea which means it is multiline
}: {
  searches: string;
}) {
  const formedData = searches.trim().split("\n").map(v => v.trim())

  await browser(async ({ page, wait, output, debug }) => {

    for await (const search of formedData) {
      const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(search)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for the selector and add a delay
      await page.waitForSelector('[jsrenderer="NTi1Eb"]');
      await wait(2);

      // scrape articles
      const articles: IArticle[] = await page.evaluate(() => {
        const articleElements = Array.from(document.querySelectorAll('[jsrenderer="NTi1Eb"]'));

        return articleElements.map(article => {
          const source = article.querySelector('.vr1PYe')?.textContent || 'No source';
          const title = article.querySelector('.JtKRv')?.textContent || 'No title';
          const link = (article.querySelector('.JtKRv') as HTMLAnchorElement)?.href || 'No link';
          const date = article.querySelector('time')?.textContent || 'No date';
          const image = (article.querySelector('img.Quavad.vwBmvb') as HTMLImageElement)?.src || 'No image found';

          return { source, title, link, date, image };
        });
      });

      debug(`started submitting articles`)

      await Promise.all(articles.map(async (article: IArticle, index: number) => {
        await output.create({
          sequence_id, sequence_output: {
            Keyword: search,
            Source: article.source,
            Title: article.title,
            PublishDate : article.date,
            NewsURL: article.link,
            ImageURL: article.image,
            ResultNumber: index + 1
          }
        })
      }))

      debug(`submitted articles`)
      await wait(2)
    }
    debug('end');

  }, { showBrowser, apikey })

}

