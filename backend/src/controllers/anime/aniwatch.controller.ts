import { Context } from "hono";
// import * as cheerio from 'cheerio'

export const getAniwatchRecommendations = async (c: Context) => {
  try {
    // const resp = await fetch('https://aniwatchtv.to/most-popular', {
    //   headers: {
    //     'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    //     "Origin": 'https://aniwatchtv.to'
    //   }
    // })
    // const html = await resp.text()
    // const $ = cheerio.load(html)
    // const content = $('.film_list-wrap')

    // const articles: any[] = []

    // content.find('.flw-item').each((i, el)=>{
    //   const title = $(el).find('.film-detail .film-name').text().trim()
    //   const id = $(el).find('.film-name a').attr('href')
    //   const descriptions = $(el).find('.description').text().replaceAll('\n', '').trim()
    //   articles.push({
    //     id,
    //     title,
    //     descriptions
    //   })
    // })

    // return c.json(articles, 200)

    


  } catch (error) {

  }
}
