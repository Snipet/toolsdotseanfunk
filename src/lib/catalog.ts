/**
 * The tool catalog.
 *
 * One entry per tool page. This drives navigation, the command palette, the
 * omnibox, related-tool links and the prerender entry list, so it is the one
 * place a new tool has to be registered. The Svelte component itself is
 * resolved by convention from `src/lib/tools/<category>/<slug>.svelte`.
 */

import { DIMENSIONS } from './units/units';

export interface Category {
	id: string;
	name: string;
	blurb: string;
	/** Inline SVG path data for the category glyph. */
	icon: string;
}

export interface Tool {
	slug: string;
	category: string;
	title: string;
	blurb: string;
	/** Extra search terms: synonyms, misspellings, task phrasings. */
	keywords?: string[];
	/** Slugs (category/slug) of tools worth suggesting alongside this one. */
	related?: string[];
	/** Shown as a badge; use for tools whose results need a caveat. */
	disclaimer?: string;
}

export const CATEGORIES: Category[] = [
	{
		id: 'convert',
		name: 'Converters',
		blurb: 'Every unit, every pair — length, weight, volume, temperature, data and more.',
		icon: 'M7 16V4m0 0L4 7m3-3 3 3m6 1v12m0 0 3-3m-3 3-3-3'
	},
	{
		id: 'cooking',
		name: 'Cooking',
		blurb: 'Cups to grams by ingredient, recipe scaling, oven temperatures and baker’s math.',
		icon: 'M12 3a4 4 0 0 0-4 4v1H6l1 13h10l1-13h-2V7a4 4 0 0 0-4-4Z'
	},
	{
		id: 'math',
		name: 'Math',
		blurb: 'Calculators that show their work — algebra, geometry, fractions and percentages.',
		icon: 'M4 6h6M7 3v6M14 6h6M14 16h6M4 16h6M7 13v6M17 13l3 6m0-6-3 6'
	},
	{
		id: 'stats',
		name: 'Statistics',
		blurb: 'Descriptive stats, distributions, regression and significance testing.',
		icon: 'M4 20V10m5 10V4m5 16v-7m5 7V8'
	},
	{
		id: 'finance',
		name: 'Finance',
		blurb: 'Loans, mortgages, compounding, salary, inflation and everyday money math.',
		icon: 'M12 3v18M8 7h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6'
	},
	{
		id: 'health',
		name: 'Health & fitness',
		blurb: 'Body metrics, training paces and everyday wellness math.',
		icon: 'M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9Z'
	},
	{
		id: 'time',
		name: 'Date & time',
		blurb: 'Date arithmetic, time zones, timers and timestamp conversion.',
		icon: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z'
	},
	{
		id: 'text',
		name: 'Text',
		blurb: 'Counting, cleaning, comparing, encoding and generating text.',
		icon: 'M5 5h14M5 12h14M5 19h9'
	},
	{
		id: 'dev',
		name: 'Developer',
		blurb: 'JSON, encoding, hashing, regex, networking and other daily dev utilities.',
		icon: 'M9 7 4 12l5 5m6-10 5 5-5 5'
	},
	{
		id: 'color',
		name: 'Color & design',
		blurb: 'Convert colors, build palettes and check contrast against WCAG.',
		icon: 'M12 3a9 9 0 1 0 0 18c1.7 0 2-1 2-2s-.3-2 1-2h2a4 4 0 0 0 4-4 9 9 0 0 0-9-10Z'
	},
	{
		id: 'image',
		name: 'Images',
		blurb: 'Resize, convert and compress — entirely in your browser.',
		icon: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5'
	},
	{
		id: 'random',
		name: 'Random & decide',
		blurb: 'Pickers, spinners, dice and generators for when you need chance on tap.',
		icon: 'M5 5h14v14H5zM9 9h.01M15 15h.01M12 12h.01'
	},
	{
		id: 'school',
		name: 'School',
		blurb: 'Grades, GPA, citations and printables for students and teachers.',
		icon: 'M12 4 2 9l10 5 10-5-10-5ZM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5'
	},
	{
		id: 'visualize',
		name: 'Visualizers',
		blurb: 'Drag the curves. Interactive models for economics, math and computer science.',
		icon: 'M4 19h16M6 15l4-6 4 4 4-8'
	},
	{
		id: 'reference',
		name: 'Reference',
		blurb: 'Charts and tables worth bookmarking — or printing.',
		icon: 'M6 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM9 8h7M9 12h7'
	}
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

const t = (
	category: string,
	slug: string,
	title: string,
	blurb: string,
	keywords: string[] = [],
	extra: Partial<Tool> = {}
): Tool => ({ category, slug, title, blurb, keywords, ...extra });

// ---------------------------------------------------------------------------
// Hand-written tools
// ---------------------------------------------------------------------------

const HAND_WRITTEN: Tool[] = [
	// --- convert -------------------------------------------------------------
	t('convert', 'number-base', 'Number base converter', 'Binary, octal, decimal, hex and any base from 2 to 36, with bit toggles.', [
		'binary', 'hex', 'hexadecimal', 'octal', 'radix', 'base 2', 'base 16', 'bits'
	]),
	t('convert', 'roman-numerals', 'Roman numeral converter', 'Numbers to Roman numerals and back, up to 3,999,999.', [
		'roman', 'numerals', 'mcmxciv', 'latin numbers'
	]),
	t('convert', 'number-to-words', 'Number to words', 'Write out numbers in English — for cheques, contracts and homework.', [
		'spell number', 'write out', 'cheque', 'check writing', 'words to number'
	]),

	// --- cooking -------------------------------------------------------------
	t('cooking', 'ingredient-converter', 'Cups to grams by ingredient', 'A cup of flour and a cup of sugar are not the same weight. This one knows the difference.', [
		'cups to grams', 'flour', 'sugar', 'butter', 'density', 'weight', 'baking'
	], { related: ['convert/volume', 'cooking/recipe-scaler'] }),
	t('cooking', 'butter-converter', 'Butter converter', 'Sticks, tablespoons, cups and grams of butter, in every direction.', [
		'stick of butter', 'butter grams', 'butter cups'
	]),
	t('cooking', 'recipe-scaler', 'Recipe scaler', 'Paste a recipe, change the servings, get sensible measures back — not 1.333 tablespoons.', [
		'double recipe', 'half recipe', 'servings', 'scale recipe', 'portions'
	]),
	t('cooking', 'oven-temperature', 'Oven temperature converter', 'Fahrenheit, Celsius, gas mark and the fan-oven adjustment.', [
		'gas mark', 'fan oven', 'convection', 'baking temperature', '350f'
	]),
	t('cooking', 'pan-size', 'Cake pan converter', 'Swap a 9-inch round for an 8-inch square, with the batter-depth warning you actually need.', [
		'cake tin', 'baking pan', 'round to square', 'pan volume'
	]),
	t('cooking', 'bakers-percentage', 'Baker’s percentage & hydration', 'Convert a dough recipe to baker’s percentages, or scale to a target dough weight.', [
		'hydration', 'sourdough', 'bread', 'dough', 'bakers math'
	]),
	t('cooking', 'coffee-ratio', 'Coffee brew ratio', 'Coffee and water for pour-over, French press, espresso and cold brew.', [
		'coffee to water', 'brew ratio', 'pour over', 'french press', 'aeropress'
	]),

	// --- math ----------------------------------------------------------------
	t('math', 'scientific-calculator', 'Scientific calculator', 'Full expression calculator with functions, constants, history and keyboard entry.', [
		'calculator', 'trig', 'log', 'sqrt', 'exponent'
	]),
	t('math', 'percentage', 'Percentage calculator', 'X% of Y, percent change, reverse percentage and percentage points — all on one page.', [
		'percent', 'percent change', 'percent increase', 'percent off', 'reverse percentage'
	], { related: ['finance/discount-calculator', 'finance/tip-calculator'] }),
	t('math', 'fraction-calculator', 'Fraction calculator', 'Add, subtract, multiply and divide fractions and mixed numbers, simplified with steps.', [
		'fractions', 'mixed numbers', 'simplify', 'lowest terms'
	]),
	t('math', 'quadratic-solver', 'Quadratic equation solver', 'Roots, discriminant, vertex and factored form — with the work shown.', [
		'quadratic formula', 'ax2+bx+c', 'roots', 'discriminant', 'parabola'
	]),
	t('math', 'triangle-solver', 'Triangle solver', 'Give any three measurements; get every side, angle and the area back.', [
		'law of sines', 'law of cosines', 'pythagorean', 'sss', 'sas', 'right triangle'
	]),
	t('math', 'circle-calculator', 'Circle calculator', 'Radius, diameter, circumference, area, arc, sector and chord.', [
		'circumference', 'area of circle', 'arc length', 'sector'
	]),
	t('math', 'prime-factorization', 'Prime factorization', 'Factor any integer, list its divisors and test primality.', [
		'prime factors', 'is prime', 'divisors', 'factor tree'
	]),
	t('math', 'gcd-lcm', 'GCD & LCM calculator', 'Greatest common divisor and least common multiple, with the Euclidean steps.', [
		'greatest common factor', 'gcf', 'hcf', 'least common multiple', 'euclid'
	]),
	t('math', 'matrix-calculator', 'Matrix calculator', 'Multiply, transpose, invert, and find determinants and reduced row echelon form.', [
		'determinant', 'inverse matrix', 'rref', 'linear algebra', 'matrices'
	]),
	t('math', 'ratio-calculator', 'Ratio & proportion solver', 'Solve A : B = C : D for any missing term, simplify ratios and scale them.', [
		'proportion', 'cross multiply', 'simplify ratio', 'scale'
	]),
	t('math', 'rounding', 'Rounding & significant figures', 'Round to any decimal place or number of significant figures, with the rule explained.', [
		'sig figs', 'significant figures', 'decimal places', 'round to nearest'
	]),

	// --- stats ---------------------------------------------------------------
	t('stats', 'descriptive-statistics', 'Descriptive statistics', 'Paste data, get mean, median, mode, standard deviation, quartiles and a box plot.', [
		'mean', 'median', 'mode', 'standard deviation', 'variance', 'quartiles', 'iqr', 'outliers'
	]),
	t('stats', 'normal-distribution', 'Normal distribution calculator', 'Probabilities and z-scores with the area under the curve shaded as you type.', [
		'z score', 'bell curve', 'gaussian', 'percentile', 'p value'
	], { related: ['visualize/central-limit-theorem'] }),
	t('stats', 'combinations-permutations', 'Combinations & permutations', 'nCr, nPr, factorials and the difference between them, in plain English.', [
		'ncr', 'npr', 'factorial', 'choose', 'combinatorics'
	]),
	t('stats', 'linear-regression', 'Linear regression', 'Fit a line to pasted data: slope, intercept, R² and a scatter plot.', [
		'least squares', 'correlation', 'r squared', 'trend line', 'scatter'
	]),
	t('stats', 'ab-test', 'A/B test significance', 'Is that conversion-rate lift real? Two-proportion z-test with a plain-language verdict.', [
		'split test', 'conversion rate', 'significance', 'p value', 'confidence'
	]),
	t('stats', 'dice-probability', 'Dice probability', 'Exact odds for any number of dice, any number of sides, any target sum.', [
		'dice odds', '2d6', 'probability of rolling', 'sum of dice'
	]),

	// --- finance -------------------------------------------------------------
	t('finance', 'loan-calculator', 'Loan calculator', 'Monthly payment, total interest and a full amortization schedule you can export.', [
		'car loan', 'personal loan', 'amortization', 'monthly payment', 'interest'
	], { related: ['finance/mortgage-calculator', 'finance/credit-card-payoff'] }),
	t('finance', 'mortgage-calculator', 'Mortgage calculator', 'Principal, interest, taxes, insurance, PMI and HOA — the payment you will actually make.', [
		'home loan', 'piti', 'pmi', 'house payment', 'escrow'
	]),
	t('finance', 'compound-interest', 'Compound interest calculator', 'Growth with regular contributions, and a chart of contributions versus interest.', [
		'savings growth', 'investment', 'apy', 'future value', 'interest'
	]),
	t('finance', 'savings-goal', 'Savings goal calculator', 'How much to set aside each month to hit a number by a date.', [
		'save for', 'target', 'monthly savings', 'goal'
	]),
	t('finance', 'salary-converter', 'Salary converter', 'Hourly, daily, weekly, monthly and annual pay, both directions.', [
		'hourly to salary', 'annual to hourly', 'wage', 'pay'
	]),
	t('finance', 'inflation-calculator', 'Inflation calculator', 'What a US dollar amount from any year since 1913 is worth today, using CPI-U.', [
		'cpi', 'purchasing power', 'worth today', 'value of money'
	], { disclaimer: 'CPI-U data through 2024; see the source note on the page.' }),
	t('finance', 'tip-calculator', 'Tip calculator', 'Tip, total and the per-person split — with tax handled the way you prefer.', [
		'gratuity', 'split bill', 'restaurant', '18 percent', '20 percent'
	]),
	t('finance', 'bill-splitter', 'Bill splitter', 'Uneven splits and who-owes-whom settlement for a group.', [
		'split the check', 'group expenses', 'settle up', 'iou'
	]),
	t('finance', 'discount-calculator', 'Discount calculator', 'Sale price, savings and stacked discounts — plus what the original price was.', [
		'percent off', 'sale price', 'markdown', 'coupon'
	]),
	t('finance', 'roi-calculator', 'ROI & CAGR calculator', 'Total return, annualized return and how long it takes to double.', [
		'return on investment', 'annualized', 'cagr', 'rule of 72'
	]),
	t('finance', 'credit-card-payoff', 'Credit card payoff', 'How long minimum payments really take, and what an extra $50 a month changes.', [
		'minimum payment', 'debt', 'payoff', 'interest charges'
	]),
	t('finance', 'margin-markup', 'Margin & markup calculator', 'Convert between margin and markup, and price from cost or cost from price.', [
		'gross margin', 'markup percent', 'pricing', 'profit'
	]),
	t('finance', 'unit-price', 'Unit price comparison', 'Which package is actually cheaper per ounce, litre or item.', [
		'price per unit', 'cost per ounce', 'grocery', 'bulk', 'better deal'
	]),

	// --- health --------------------------------------------------------------
	t('health', 'bmi', 'BMI calculator', 'Body mass index in metric or imperial, with an honest note on its limits.', [
		'body mass index', 'weight status', 'obesity'
	], { disclaimer: 'Educational only — BMI is a population screening tool, not a diagnosis.' }),
	t('health', 'bmr-tdee', 'BMR & TDEE calculator', 'Resting and total daily energy expenditure using Mifflin–St Jeor.', [
		'calories', 'metabolism', 'maintenance calories', 'mifflin', 'harris benedict'
	], { disclaimer: 'Estimates only — individual metabolism varies widely.' }),
	t('health', 'macro-calculator', 'Macro calculator', 'Split a calorie target into protein, carbohydrate and fat, in grams.', [
		'macros', 'protein', 'carbs', 'fat', 'iifym'
	], { disclaimer: 'Educational only — not nutritional advice.' }),
	t('health', 'body-fat', 'Body fat percentage', 'The US Navy tape method, plus lean mass and fat mass.', [
		'navy method', 'lean body mass', 'circumference'
	], { disclaimer: 'A rough estimate; tape methods carry several points of error.' }),
	t('health', 'pace-calculator', 'Running pace calculator', 'Pace, time and distance — solve for any one, in min/mile or min/km.', [
		'min per mile', 'marathon pace', 'splits', '5k', 'running'
	]),
	t('health', 'one-rep-max', 'One-rep max calculator', 'Estimated 1RM from a set, plus a full percentage-of-max training table.', [
		'1rm', 'epley', 'brzycki', 'lifting', 'strength'
	], { disclaimer: 'Estimates only — warm up and lift within your ability.' }),
	t('health', 'heart-rate-zones', 'Heart rate zones', 'Training zones from maximum or resting heart rate (Karvonen method).', [
		'karvonen', 'max hr', 'zone 2', 'cardio'
	], { disclaimer: 'Educational only — talk to a clinician before starting hard training.' }),
	t('health', 'due-date', 'Pregnancy due date', 'Estimated due date and current week from a last period or conception date.', [
		'edd', 'pregnancy', 'weeks pregnant', 'naegele'
	], { disclaimer: 'An estimate — only a clinician can date a pregnancy properly.' }),
	t('health', 'water-intake', 'Water intake calculator', 'A daily fluid target from body weight, activity and climate.', [
		'hydration', 'how much water', 'drink'
	], { disclaimer: 'A rough guide; needs vary with health, medication and climate.' }),
	t('health', 'caffeine-half-life', 'Caffeine half-life', 'How much caffeine is still in you at bedtime, and when it wears off.', [
		'coffee', 'espresso', 'sleep', 'metabolism', 'decay'
	], { disclaimer: 'Educational only — caffeine metabolism varies severalfold between people.' }),
	t('health', 'sleep-calculator', 'Sleep cycle calculator', 'Bedtimes and wake times aligned to 90-minute sleep cycles.', [
		'bedtime', 'wake up', 'sleep cycles', 'rem'
	], { disclaimer: 'Cycle length varies; treat these as approximate.' }),

	// --- time ----------------------------------------------------------------
	t('time', 'date-difference', 'Date difference', 'Days, weeks, months and years between two dates — with or without weekends.', [
		'days between', 'how many days', 'date calculator', 'duration'
	]),
	t('time', 'date-add', 'Add or subtract days', 'Add days, weeks, months or years to a date, optionally counting business days only.', [
		'date plus', 'days from today', '90 days from', 'deadline'
	]),
	t('time', 'age-calculator', 'Age calculator', 'Exact age in years, months and days — plus your age on any other date.', [
		'how old am i', 'birthday', 'age on date', 'days alive'
	]),
	t('time', 'time-zone-converter', 'Time zone converter', 'Compare a time across cities and find the overlap in everyone’s working day.', [
		'timezone', 'utc', 'meeting planner', 'world clock', 'gmt'
	]),
	t('time', 'countdown', 'Countdown timer', 'A big, shareable countdown to any moment — good on a projector.', [
		'timer', 'days until', 'christmas countdown', 'egg timer'
	]),
	t('time', 'stopwatch', 'Stopwatch', 'Start, stop, lap — with keyboard control and a readable display.', ['lap timer', 'chronometer', 'split']),
	t('time', 'pomodoro', 'Pomodoro timer', '25 on, 5 off, with session counts and a gentle chime.', [
		'focus timer', 'work timer', 'study timer', 'tomato'
	]),
	t('time', 'unix-timestamp', 'Unix timestamp converter', 'Epoch seconds and milliseconds to human dates, in UTC and local time.', [
		'epoch', 'timestamp', 'iso 8601', 'milliseconds'
	]),
	t('time', 'week-number', 'Week number & day of year', 'ISO week number, day of year, quarter and days remaining, for any date.', [
		'iso week', 'day of year', 'quarter', 'calendar week'
	]),
	t('time', 'duration-calculator', 'Duration calculator', 'Add and subtract hours, minutes and seconds — timesheets, video edits, race splits.', [
		'add time', 'hh:mm:ss', 'timesheet', 'total hours'
	]),
	t('time', 'business-days', 'Business days calculator', 'Working days between dates, skipping weekends and the holidays you pick.', [
		'working days', 'weekdays', 'sla', 'turnaround'
	]),
	t('time', 'cron-expression', 'Cron expression builder', 'Build a cron schedule, read one back in English, and see the next run times.', [
		'crontab', 'schedule', 'cron parser', '*/15'
	]),

	// --- text ----------------------------------------------------------------
	t('text', 'word-counter', 'Word & character counter', 'Words, characters, sentences, reading time and social-media limits, live.', [
		'character count', 'word count', 'twitter limit', 'sms segments', 'reading time'
	]),
	t('text', 'case-converter', 'Case converter', 'UPPER, lower, Title, Sentence, camelCase, snake_case, kebab-case and more.', [
		'uppercase', 'lowercase', 'title case', 'camel case', 'snake case'
	]),
	t('text', 'line-tools', 'Line tools', 'Sort, deduplicate, shuffle, number, trim and reverse lines of text.', [
		'sort lines', 'remove duplicates', 'dedupe', 'shuffle lines', 'add line numbers'
	]),
	t('text', 'diff-checker', 'Diff checker', 'Compare two blocks of text and see exactly what changed, line by line.', [
		'compare text', 'text difference', 'changes', 'merge'
	]),
	t('text', 'find-replace', 'Find & replace', 'Bulk replace across text, with regex, capture groups and a live preview.', [
		'search replace', 'regex replace', 'bulk edit'
	]),
	t('text', 'lorem-ipsum', 'Lorem ipsum generator', 'Placeholder text in classic Latin or four alternative flavours.', [
		'placeholder text', 'dummy text', 'filler'
	]),
	t('text', 'slug-generator', 'Slug generator', 'Turn any title into a clean, URL-safe slug.', ['url slug', 'permalink', 'seo url']),
	t('text', 'morse-code', 'Morse code translator', 'Text to Morse and back, with audible playback at your chosen speed.', [
		'morse', 'sos', 'dot dash', 'telegraph'
	]),
	t('text', 'nato-phonetic', 'NATO phonetic alphabet', 'Spell anything over the phone: Alfa, Bravo, Charlie.', [
		'phonetic alphabet', 'spelling alphabet', 'alfa bravo'
	]),
	t('text', 'caesar-cipher', 'Caesar cipher & ROT13', 'Shift-cipher encoder, decoder and a brute-force cracker for puzzles.', [
		'rot13', 'shift cipher', 'decrypt', 'cryptogram'
	]),
	t('text', 'readability', 'Readability score', 'Flesch reading ease, Flesch–Kincaid grade level and four other indices.', [
		'flesch kincaid', 'grade level', 'reading level', 'gunning fog'
	]),
	t('text', 'fancy-text', 'Fancy text generator', 'Unicode script, gothic, bold, small caps and upside-down text.', [
		'unicode fonts', 'cool text', 'bold text', 'upside down'
	], { disclaimer: 'Screen readers can mangle these characters — avoid them in body copy.' }),
	t('text', 'notepad', 'Online notepad', 'A distraction-free scratchpad that saves to your browser and works offline.', [
		'scratchpad', 'notes', 'text editor', 'quick note'
	]),

	// --- dev -----------------------------------------------------------------
	t('dev', 'json-formatter', 'JSON formatter & validator', 'Pretty-print, minify and validate JSON with the error located for you.', [
		'json pretty', 'json validate', 'json beautify', 'minify'
	]),
	t('dev', 'csv-json', 'CSV ↔ JSON converter', 'Convert between CSV and JSON in either direction, with delimiter detection.', [
		'csv to json', 'json to csv', 'tsv', 'spreadsheet'
	]),
	t('dev', 'base64', 'Base64 encoder & decoder', 'Text and files to Base64 and back, URL-safe variant included.', [
		'b64', 'encode', 'decode', 'data uri'
	]),
	t('dev', 'url-encoder', 'URL encoder & parser', 'Percent-encode, decode, and break a URL into its parts and query pairs.', [
		'percent encoding', 'query string', 'urlencode', 'uri'
	]),
	t('dev', 'jwt-decoder', 'JWT decoder', 'Inspect a JSON Web Token’s header, payload and expiry. Nothing is sent anywhere.', [
		'json web token', 'jwt', 'bearer', 'claims'
	]),
	t('dev', 'hash-generator', 'Hash generator', 'SHA-1, SHA-256, SHA-384 and SHA-512 of text or a file, computed locally.', [
		'sha256', 'checksum', 'digest', 'fingerprint'
	]),
	t('dev', 'uuid-generator', 'UUID generator', 'Version 4 and version 7 UUIDs, plus nanoid-style short tokens, in bulk.', [
		'guid', 'uuid4', 'uuid7', 'random id', 'nanoid'
	]),
	t('dev', 'password-generator', 'Password generator', 'Random passwords and diceware passphrases, with a real entropy readout.', [
		'passphrase', 'diceware', 'strong password', 'entropy', 'random password'
	]),
	t('dev', 'regex-tester', 'Regex tester', 'Live matches, capture groups and a replace preview, with a pattern cheat sheet.', [
		'regular expression', 'regexp', 'pattern', 'match'
	]),
	t('dev', 'html-entities', 'HTML entity encoder', 'Escape and unescape HTML entities, with a searchable reference table.', [
		'escape html', 'nbsp', 'ampersand', 'entities'
	]),
	t('dev', 'qr-code', 'QR code generator', 'A QR code for any link or text, rendered locally and downloadable as SVG or PNG.', [
		'qr', 'barcode', 'wifi qr', 'scan'
	]),
	t('dev', 'bitwise-calculator', 'Bitwise calculator', 'AND, OR, XOR, NOT and shifts, shown in binary, decimal and hex.', [
		'and or xor', 'bit shift', 'twos complement', 'bit manipulation'
	]),
	t('dev', 'chmod-calculator', 'chmod calculator', 'Octal permissions to rwx and back, with the symbolic command to run.', [
		'file permissions', '755', '644', 'unix permissions'
	]),
	t('dev', 'subnet-calculator', 'Subnet & CIDR calculator', 'Network, broadcast, host range and mask for any IPv4 CIDR block.', [
		'cidr', 'netmask', 'ip range', 'vlsm', 'network address'
	]),
	t('dev', 'aspect-ratio', 'Aspect ratio calculator', 'Solve for the missing dimension and identify common ratios.', [
		'16:9', 'resize dimensions', 'ratio', 'video size'
	]),
	t('dev', 'markdown-preview', 'Markdown previewer', 'Write Markdown, see it rendered, and copy the HTML out.', [
		'md', 'markdown to html', 'readme', 'preview'
	]),
	t('dev', 'ieee-754', 'Float (IEEE-754) inspector', 'See exactly why 0.1 + 0.2 ≠ 0.3, bit by bit.', [
		'floating point', 'binary32', 'binary64', 'double', 'mantissa'
	]),

	// --- color ---------------------------------------------------------------
	t('color', 'color-converter', 'Color converter', 'HEX, RGB, HSL, HSV and CMYK — every format, kept in sync.', [
		'hex to rgb', 'rgb to hex', 'hsl', 'cmyk', 'color picker'
	]),
	t('color', 'contrast-checker', 'Contrast checker', 'WCAG 2.2 contrast ratio with pass/fail for every text size, and a suggested fix.', [
		'wcag', 'accessibility', 'a11y', 'contrast ratio', 'aa aaa'
	]),
	t('color', 'palette-generator', 'Palette generator', 'Build harmonies — complementary, triadic, analogous — from any base color.', [
		'color scheme', 'harmony', 'complementary', 'triadic', 'analogous'
	]),
	t('color', 'shades-generator', 'Shades & tints', 'A full tonal ramp from any color, ready to paste into a design system.', [
		'tints', 'tones', 'color scale', 'lighten', 'darken'
	]),
	t('color', 'gradient-generator', 'CSS gradient generator', 'Linear and radial gradients with live CSS output.', [
		'linear gradient', 'radial gradient', 'css background'
	]),
	t('color', 'color-blindness', 'Color blindness simulator', 'See a palette as someone with deuteranopia, protanopia or tritanopia would.', [
		'deuteranopia', 'protanopia', 'tritanopia', 'colorblind', 'accessibility'
	]),

	// --- image ---------------------------------------------------------------
	t('image', 'resize', 'Image resizer', 'Resize by pixels or percentage, in your browser. The file never leaves your device.', [
		'resize photo', 'scale image', 'shrink picture', 'dimensions'
	]),
	t('image', 'convert', 'Image format converter', 'PNG, JPEG and WebP in any direction, entirely client-side.', [
		'png to jpg', 'jpg to webp', 'webp', 'image format'
	]),
	t('image', 'compress', 'Image compressor', 'Squeeze an image to a target size with a live quality preview.', [
		'compress photo', 'reduce file size', 'optimize image', 'under 200kb'
	]),
	t('image', 'crop', 'Image cropper', 'Crop freehand or to a preset ratio, with passport and social sizes built in.', [
		'crop photo', 'square crop', '16:9', 'passport photo'
	]),
	t('image', 'to-base64', 'Image to Base64', 'Turn an image into a data URI you can paste straight into CSS or HTML.', [
		'data uri', 'base64 image', 'inline image'
	]),

	// --- random --------------------------------------------------------------
	t('random', 'number-generator', 'Random number generator', 'Any range, with or without repeats, and a shareable seed for reproducible draws.', [
		'rng', 'pick a number', 'random integer', 'raffle'
	]),
	t('random', 'dice-roller', 'Dice roller', 'Standard dice notation — 4d6+2, advantage, disadvantage and roll history.', [
		'd20', 'dnd', 'roll dice', '2d6', 'tabletop'
	]),
	t('random', 'coin-flip', 'Coin flip', 'Flip one coin or a thousand, with running streak statistics.', [
		'heads or tails', 'toss', 'coin toss'
	]),
	t('random', 'wheel-spinner', 'Wheel spinner', 'A spinning wheel of your own options — with elimination mode for classrooms.', [
		'spin the wheel', 'random picker', 'decision wheel', 'raffle'
	]),
	t('random', 'list-randomizer', 'List randomizer', 'Shuffle a list, or draw a few winners fairly from it.', [
		'shuffle list', 'random order', 'pick winner', 'giveaway'
	]),
	t('random', 'team-generator', 'Team generator', 'Split a roster into balanced teams, with keep-apart rules.', [
		'random teams', 'groups', 'split into groups', 'pairs'
	]),
	t('random', 'secret-santa', 'Secret Santa matcher', 'Draw names with exclusions — and nobody has to see the whole list.', [
		'gift exchange', 'kris kringle', 'draw names', 'christmas'
	]),
	t('random', 'decision-matrix', 'Decision matrix', 'Score options against weighted criteria and let the arithmetic decide.', [
		'weighted decision', 'pros and cons', 'compare options', 'pugh matrix'
	]),

	// --- school --------------------------------------------------------------
	t('school', 'grade-calculator', 'Grade calculator', 'Weighted categories in, current grade out.', [
		'weighted grade', 'class grade', 'assignment weights'
	]),
	t('school', 'final-grade', 'Final grade calculator', 'What you need on the final to land the grade you want.', [
		'what do i need on the final', 'exam grade', 'final exam'
	]),
	t('school', 'gpa-calculator', 'GPA calculator', 'Semester and cumulative GPA on the 4.0 scale, weighted or unweighted.', [
		'grade point average', '4.0 scale', 'honors weighting', 'cumulative gpa'
	]),
	t('school', 'citation-generator', 'Citation generator', 'Format a source in APA 7, MLA 9, Chicago, Harvard or IEEE.', [
		'apa', 'mla', 'chicago', 'bibliography', 'works cited', 'harvard'
	]),
	t('school', 'graph-paper', 'Graph paper generator', 'Printable square, dot, isometric, polar and log paper, in any spacing.', [
		'printable graph paper', 'grid paper', 'isometric', 'dot grid'
	]),
	t('school', 'multiplication-chart', 'Multiplication chart', 'A printable times table up to any size, with a blank practice version.', [
		'times table', 'times tables', 'printable', 'math practice'
	]),

	// --- visualize -----------------------------------------------------------
	t('visualize', 'supply-and-demand', 'Supply & demand', 'Drag the curves. Watch equilibrium, surplus, taxes and price controls respond in real time.', [
		'equilibrium', 'microeconomics', 'econ', 'shortage', 'surplus', 'deadweight loss', 'price ceiling',
		'price floor', 'tax incidence', 'elasticity', 'consumer surplus'
	], { related: ['visualize/function-grapher'] }),
	t('visualize', 'function-grapher', 'Function grapher', 'Plot several functions at once, with parameter sliders and a readable grid.', [
		'graphing calculator', 'plot', 'desmos', 'y=', 'graph equation'
	]),
	t('visualize', 'central-limit-theorem', 'Central limit theorem', 'Sample from a wild distribution and watch the sample means go normal anyway.', [
		'clt', 'sampling distribution', 'law of large numbers', 'statistics sim'
	]),
	t('visualize', 'sorting-algorithms', 'Sorting algorithm visualizer', 'Bubble, insertion, selection, merge and quicksort, racing side by side.', [
		'bubble sort', 'quicksort', 'merge sort', 'algorithms', 'big o'
	]),
	t('visualize', 'unit-circle', 'Unit circle explorer', 'Drag the angle; see sine, cosine and tangent trace out together.', [
		'trigonometry', 'sine wave', 'cosine', 'radians', 'exact values'
	]),

	// --- reference -----------------------------------------------------------
	t('reference', 'cooking-chart', 'Cooking conversion chart', 'The printable cups-to-grams-to-millilitres table, by ingredient.', [
		'kitchen conversions', 'printable chart', 'cups grams', 'measurement chart'
	]),
	t('reference', 'ascii-table', 'ASCII table', 'All 128 ASCII codes in decimal, hex, octal and binary, searchable.', [
		'ascii codes', 'character codes', 'control characters'
	]),
	t('reference', 'http-status-codes', 'HTTP status codes', 'Every status code, what it means, and when to actually use it.', [
		'404', '500', '301', 'http codes', 'rest'
	]),
	t('reference', 'paper-sizes', 'Paper sizes', 'A-series, B-series and US paper sizes in millimetres, inches and pixels.', [
		'a4', 'letter', 'a3', 'paper dimensions', 'print size'
	]),
	t('reference', 'greek-alphabet', 'Greek alphabet', 'Letters, names, pronunciation and what each one usually means in science.', [
		'alpha beta gamma', 'symbols', 'math notation'
	])
];

// ---------------------------------------------------------------------------
// Generated converter pages
// ---------------------------------------------------------------------------

/** Pairs that deserve their own landing page, because people search for them. */
export const CONVERTER_PAIRS: Array<[string, string]> = [
	['tablespoon', 'teaspoon'],
	['teaspoon', 'tablespoon'],
	['cup', 'milliliter'],
	['milliliter', 'cup'],
	['cup', 'tablespoon'],
	['tablespoon', 'cup'],
	['fluid-ounce', 'milliliter'],
	['milliliter', 'fluid-ounce'],
	['liter', 'gallon'],
	['gallon', 'liter'],
	['pint', 'milliliter'],
	['quart', 'liter'],
	['stick-of-butter', 'gram'],
	['celsius', 'fahrenheit'],
	['fahrenheit', 'celsius'],
	['celsius', 'kelvin'],
	['kelvin', 'celsius'],
	['inch', 'centimeter'],
	['centimeter', 'inch'],
	['foot', 'meter'],
	['meter', 'foot'],
	['mile', 'kilometer'],
	['kilometer', 'mile'],
	['yard', 'meter'],
	['meter', 'yard'],
	['millimeter', 'inch'],
	['inch', 'millimeter'],
	['nautical-mile', 'kilometer'],
	['light-year', 'kilometer'],
	['kilogram', 'pound'],
	['pound', 'kilogram'],
	['gram', 'ounce'],
	['ounce', 'gram'],
	['stone', 'pound'],
	['stone', 'kilogram'],
	['pound', 'ounce'],
	['tonne', 'pound'],
	['mile-per-hour', 'kilometer-per-hour'],
	['kilometer-per-hour', 'mile-per-hour'],
	['knot', 'mile-per-hour'],
	['meter-per-second', 'mile-per-hour'],
	['square-foot', 'square-meter'],
	['square-meter', 'square-foot'],
	['acre', 'square-foot'],
	['acre', 'hectare'],
	['hectare', 'acre'],
	['megabyte', 'gigabyte'],
	['gigabyte', 'megabyte'],
	['gigabyte', 'terabyte'],
	['byte', 'kilobyte'],
	['mebibyte', 'megabyte'],
	['megabit-per-second', 'megabyte-per-second'],
	['psi', 'bar'],
	['bar', 'psi'],
	['psi', 'kilopascal'],
	['atmosphere', 'psi'],
	['kilocalorie', 'kilojoule'],
	['kilojoule', 'kilocalorie'],
	['kilowatt-hour', 'joule'],
	['btu', 'kilowatt-hour'],
	['horsepower', 'kilowatt'],
	['kilowatt', 'horsepower'],
	['radian', 'degree'],
	['degree', 'radian'],
	['mile-per-gallon-us', 'liter-per-100km'],
	['liter-per-100km', 'mile-per-gallon-us'],
	['hour', 'minute'],
	['day', 'hour'],
	['week', 'day'],
	['year', 'day'],
	['minute', 'second']
];

function unitDisplay(id: string): { title: string; plural: string } {
	for (const d of DIMENSIONS) {
		const unit = d.units.find((x) => x.id === id);
		if (unit) return { title: unit.name, plural: unit.plural ?? unit.name + 's' };
	}
	throw new Error(`Unknown unit in CONVERTER_PAIRS: ${id}`);
}

function dimensionOf(id: string): string {
	for (const d of DIMENSIONS) if (d.units.some((x) => x.id === id)) return d.id;
	throw new Error(`Unknown unit: ${id}`);
}

const DIMENSION_TOOLS: Tool[] = DIMENSIONS.map((d) =>
	t(
		'convert',
		d.id,
		`${d.name} converter`,
		d.blurb,
		[d.name.toLowerCase(), 'converter', ...d.units.slice(0, 8).map((x) => x.name)]
	)
);

const PAIR_TOOLS: Tool[] = CONVERTER_PAIRS.map(([from, to]) => {
	const a = unitDisplay(from);
	const b = unitDisplay(to);
	const slug = `${from}-to-${to}`;
	return t(
		'convert',
		slug,
		`${cap(a.plural)} to ${b.plural}`,
		`Convert ${a.plural} to ${b.plural}, with the formula and a quick reference table.`,
		[`${a.plural} to ${b.plural}`, `${from} to ${to}`, 'convert'],
		{ related: [`convert/${dimensionOf(from)}`] }
	);
});

function cap(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** True for `/convert/<a>-to-<b>` slugs handled by the generic converter. */
export function parsePairSlug(slug: string): { from: string; to: string } | undefined {
	const match = CONVERTER_PAIRS.find(([f, x]) => `${f}-to-${x}` === slug);
	return match ? { from: match[0], to: match[1] } : undefined;
}

export const TOOLS: Tool[] = [...HAND_WRITTEN, ...DIMENSION_TOOLS, ...PAIR_TOOLS];

export const TOOL_BY_PATH = new Map(TOOLS.map((x) => [`${x.category}/${x.slug}`, x]));

export function toolsIn(categoryId: string): Tool[] {
	return TOOLS.filter((x) => x.category === categoryId);
}

export function toolPath(tool: Tool): string {
	return `/${tool.category}/${tool.slug}`;
}

/** Tools that get a slot on the home page. */
export const FEATURED: string[] = [
	'visualize/supply-and-demand',
	'convert/tablespoon-to-teaspoon',
	'finance/loan-calculator',
	'text/word-counter',
	'math/percentage',
	'time/date-difference',
	'dev/json-formatter',
	'cooking/ingredient-converter',
	'health/bmi',
	'color/contrast-checker',
	'random/wheel-spinner',
	'image/resize'
];
