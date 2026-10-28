// Registry of every layout recipe by id.
import type { Recipe } from './kit';
import { SOCIAL_A } from './layouts/social';
import { SOCIAL_B } from './layouts/social2';
import { SLIDES_A } from './layouts/slides';
import { SLIDES_B } from './layouts/slides2';
import { PRINT_A } from './layouts/print';
import { PRINT_B } from './layouts/print2';
import { PRINT_C } from './layouts/print3';
import { LOGOS } from './layouts/logos';
import { BOARDS } from './layouts/board';
import { WEB } from './layouts/web';
import { WEB_B } from './layouts/web2';

const ALL: Recipe[][] = [SOCIAL_A, SOCIAL_B, SLIDES_A, SLIDES_B, PRINT_A, PRINT_B, PRINT_C, LOGOS, BOARDS, WEB, WEB_B];

export const RECIPES: Record<string, Recipe> = Object.fromEntries(ALL.flat().map((r) => [r.id, r]));
export const RECIPE_COUNT = () => Object.keys(RECIPES).length;
