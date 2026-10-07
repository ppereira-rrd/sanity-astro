import {heroSection} from './heroSection'
import {headingSection} from './headingSection'
import {textSection} from './textSection'
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
  textSection,
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
export const sectionMembers = [
  ...sectionTypes.map((section) => ({type: section.name})),
  // Not a section type of its own — just a standalone link pages and posts can drop in.
  {type: 'button'},
]
