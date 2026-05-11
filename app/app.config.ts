export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    },
    pageHero: {
      slots: {
        container: '!py-16 !gap-8'
      }
    },

    pageSection: {
      slots: {
        container: '!py-16'
      }
    }
  }
})
