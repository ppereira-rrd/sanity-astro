import {heroSection} from './heroSection'
import {headingSection} from './headingSection'
import {ctaSection} from './ctaSection'
import {faqSection} from './faqSection'
import {featureGridSection} from './featureGridSection'
import {testimonialSection} from './testimonialSection'
import {caseResultSection} from './caseResultSection'
import {attorneySection} from './attorneySection'
import {keyTakeawaysSection} from './keyTakeawaysSection'

export const sectionTypes = [
  heroSection,
  headingSection,
  ctaSection,
  faqSection,
  featureGridSection,
  testimonialSection,
  caseResultSection,
  attorneySection,
  keyTakeawaysSection,
]

/**
 * Every section, ready to drop into an array field's `of`. Pages and posts both
 * use this so a new section only has to be registered in one place.
 */
export const sectionMembers = sectionTypes.map((section) => ({type: section.name}))
