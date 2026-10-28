// Public API of the Cream templates system.
export { TEMPLATE_CATEGORIES, KINDS } from './catalog';
export { searchTemplates, getIndex, metaFor, countBy, type TemplateMeta, type SearchOpts } from './meta';
export { buildTemplate, instantiateTemplate, applyTemplateToCurrentDesign } from './apply';
export { build as buildTemplateCached, pageRecipes } from './build';
export { LAYOUTS, applyLayout, type LayoutDef } from './arrange';
export { PALETTES, FONT_SETS, THEMES } from './themes';
export { TOPICS } from './content';
export { applyPalette, applyFontSet, applyBrandKit } from './styling';
