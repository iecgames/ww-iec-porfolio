import type { RequiredDataFromCollectionSlug } from 'payload'

// Used for pre-seeded content so that the homepage is not empty
export const homeStatic: RequiredDataFromCollectionSlug<'pages'> = {
  slug: 'home',
  _status: 'published',
  hero: {
    type: 'none',
  },
  meta: {
    description: 'A mobile game studio',
    title: 'IEC Games - Winter Wolf',
  },
  title: 'Home',
  layout: [],
}
