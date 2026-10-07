import {defineMigration} from 'sanity/migrate'

// Studio internals that must survive a wipe.
const PROTECTED = /^(system\.|sanity\.)/

export default defineMigration({
  title: 'Clear dataset',
  // Omit `documentTypes` to visit every document.
  migrate: {
    document(doc) {
      if (PROTECTED.test(doc._type)) return undefined
      return {delete: {id: doc._id}}
    },
  },
})
