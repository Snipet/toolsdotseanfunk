/**
 * Ingredient densities, in grams per US cup (236.588 mL).
 *
 * This is the table most conversion sites get wrong: a cup of flour and a cup
 * of sugar are both "a cup", but one is 120 g and the other is 200 g. Values
 * are the commonly-published cook's figures — King Arthur Baking's ingredient
 * weight chart for baking staples, USDA FoodData Central for whole foods —
 * rounded to the nearest gram.
 *
 * Flour especially depends on technique: 120 g/cup assumes fluff-and-scoop.
 * Scooping straight from the bag packs in closer to 145 g, which is why
 * weighing beats measuring.
 */

export interface Ingredient {
	id: string;
	name: string;
	/** Grams in one US cup. */
	gramsPerCup: number;
	group: string;
	note?: string;
}

export const INGREDIENTS: Ingredient[] = [
	// Flours & dry baking
	{ id: 'flour-ap', name: 'All-purpose flour', gramsPerCup: 120, group: 'Flour & grain', note: 'Spooned and levelled. Scooped from the bag runs 140–145 g.' },
	{ id: 'flour-bread', name: 'Bread flour', gramsPerCup: 127, group: 'Flour & grain' },
	{ id: 'flour-cake', name: 'Cake flour', gramsPerCup: 113, group: 'Flour & grain' },
	{ id: 'flour-whole-wheat', name: 'Whole wheat flour', gramsPerCup: 113, group: 'Flour & grain' },
	{ id: 'flour-almond', name: 'Almond flour', gramsPerCup: 96, group: 'Flour & grain' },
	{ id: 'cornstarch', name: 'Cornstarch / cornflour', gramsPerCup: 113, group: 'Flour & grain' },
	{ id: 'cornmeal', name: 'Cornmeal', gramsPerCup: 138, group: 'Flour & grain' },
	{ id: 'oats-rolled', name: 'Rolled oats', gramsPerCup: 89, group: 'Flour & grain' },
	{ id: 'rice-white', name: 'White rice, uncooked', gramsPerCup: 185, group: 'Flour & grain' },
	{ id: 'rice-cooked', name: 'White rice, cooked', gramsPerCup: 158, group: 'Flour & grain' },
	{ id: 'breadcrumbs', name: 'Breadcrumbs, dry', gramsPerCup: 108, group: 'Flour & grain' },
	{ id: 'quinoa', name: 'Quinoa, uncooked', gramsPerCup: 170, group: 'Flour & grain' },

	// Sugars & sweeteners
	{ id: 'sugar-granulated', name: 'Granulated sugar', gramsPerCup: 200, group: 'Sugar & sweetener' },
	{ id: 'sugar-brown', name: 'Brown sugar, packed', gramsPerCup: 213, group: 'Sugar & sweetener' },
	{ id: 'sugar-powdered', name: 'Powdered / icing sugar', gramsPerCup: 113, group: 'Sugar & sweetener' },
	{ id: 'honey', name: 'Honey', gramsPerCup: 340, group: 'Sugar & sweetener' },
	{ id: 'maple-syrup', name: 'Maple syrup', gramsPerCup: 322, group: 'Sugar & sweetener' },
	{ id: 'molasses', name: 'Molasses', gramsPerCup: 340, group: 'Sugar & sweetener' },
	{ id: 'corn-syrup', name: 'Corn syrup', gramsPerCup: 340, group: 'Sugar & sweetener' },

	// Fats & dairy
	{ id: 'butter', name: 'Butter', gramsPerCup: 227, group: 'Fat & dairy', note: '1 cup = 2 sticks = 16 tbsp' },
	{ id: 'oil-vegetable', name: 'Vegetable oil', gramsPerCup: 218, group: 'Fat & dairy' },
	{ id: 'oil-olive', name: 'Olive oil', gramsPerCup: 216, group: 'Fat & dairy' },
	{ id: 'shortening', name: 'Shortening', gramsPerCup: 191, group: 'Fat & dairy' },
	{ id: 'milk', name: 'Milk, whole', gramsPerCup: 242, group: 'Fat & dairy' },
	{ id: 'buttermilk', name: 'Buttermilk', gramsPerCup: 245, group: 'Fat & dairy' },
	{ id: 'cream-heavy', name: 'Heavy cream', gramsPerCup: 238, group: 'Fat & dairy' },
	{ id: 'yogurt', name: 'Yogurt, plain', gramsPerCup: 245, group: 'Fat & dairy' },
	{ id: 'sour-cream', name: 'Sour cream', gramsPerCup: 227, group: 'Fat & dairy' },
	{ id: 'cream-cheese', name: 'Cream cheese', gramsPerCup: 227, group: 'Fat & dairy' },
	{ id: 'cheese-cheddar', name: 'Cheddar, shredded', gramsPerCup: 113, group: 'Fat & dairy' },
	{ id: 'cheese-parmesan', name: 'Parmesan, grated', gramsPerCup: 100, group: 'Fat & dairy' },

	// Liquids
	{ id: 'water', name: 'Water', gramsPerCup: 237, group: 'Liquid' },
	{ id: 'stock', name: 'Stock / broth', gramsPerCup: 240, group: 'Liquid' },

	// Baking odds and ends
	{ id: 'cocoa', name: 'Cocoa powder, unsweetened', gramsPerCup: 85, group: 'Baking' },
	{ id: 'chocolate-chips', name: 'Chocolate chips', gramsPerCup: 170, group: 'Baking' },
	{ id: 'peanut-butter', name: 'Peanut butter', gramsPerCup: 270, group: 'Baking' },
	{ id: 'salt-table', name: 'Table salt', gramsPerCup: 273, group: 'Baking' },
	{ id: 'salt-kosher-diamond', name: 'Kosher salt (Diamond Crystal)', gramsPerCup: 140, group: 'Baking', note: 'Morton kosher salt is much denser — about 240 g/cup.' },
	{ id: 'baking-powder', name: 'Baking powder', gramsPerCup: 192, group: 'Baking' },
	{ id: 'baking-soda', name: 'Baking soda', gramsPerCup: 220, group: 'Baking' },
	{ id: 'yeast-instant', name: 'Instant yeast', gramsPerCup: 150, group: 'Baking' },

	// Nuts, fruit & veg
	{ id: 'almonds-whole', name: 'Almonds, whole', gramsPerCup: 143, group: 'Nuts & produce' },
	{ id: 'walnuts', name: 'Walnuts, chopped', gramsPerCup: 117, group: 'Nuts & produce' },
	{ id: 'raisins', name: 'Raisins', gramsPerCup: 145, group: 'Nuts & produce' },
	{ id: 'onion-chopped', name: 'Onion, chopped', gramsPerCup: 160, group: 'Nuts & produce' },
	{ id: 'carrot-grated', name: 'Carrot, grated', gramsPerCup: 110, group: 'Nuts & produce' },
	{ id: 'tomato-diced', name: 'Tomato, diced', gramsPerCup: 180, group: 'Nuts & produce' },
	{ id: 'berries', name: 'Berries, fresh', gramsPerCup: 145, group: 'Nuts & produce' },
	{ id: 'banana-mashed', name: 'Banana, mashed', gramsPerCup: 225, group: 'Nuts & produce' }
];

export const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((x) => [x.id, x]));

export const INGREDIENT_GROUPS = [...new Set(INGREDIENTS.map((x) => x.group))];

/** US cup in millilitres — the reference volume for the table above. */
export const CUP_ML = 236.5882365;
