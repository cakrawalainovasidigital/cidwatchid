import { Context } from "hono";


const provider = [{
  name: 'dramabox',
  type: 1
}, {
  name: 'melolo',
  type: 2
}]

export const getDramaProviders = (c: Context) => {
  const data = {
    success: true,
    source: 'drama',
    path: c.req.path,
    data: provider
  }

  return c.json(data, 200)
}