/**
 * The unit conversion engine.
 *
 * Every unit is defined by its ratio to the dimension's base unit, so a
 * conversion is `value * from.factor / to.factor`. Temperature is the one
 * exception — it is affine, not linear — so it carries explicit to/from base
 * functions instead.
 *
 * Sources for the factors: NIST SP 811 (Guide for the Use of the International
 * System of Units) and BIPM SI Brochure, 9th edition.
 */

export type UnitId = string;

export interface Unit {
	id: UnitId;
	/** Singular display name, lowercase: "kilometre per hour". */
	name: string;
	/** Plural display name. Defaults to name + "s". */
	plural?: string;
	/** Short symbol: "km/h". */
	symbol: string;
	/** Ratio to the dimension base unit. Ignored when `toBase` is present. */
	factor: number;
	/** Alternative spellings and abbreviations used by search and the omnibox. */
	aliases?: string[];
	/** Affine conversions (temperature). */
	toBase?: (v: number) => number;
	fromBase?: (v: number) => number;
	/** Marks units that only make sense in a specific locale, e.g. US cups. */
	note?: string;
}

export interface Dimension {
	id: string;
	name: string;
	/** Base unit id — every factor in the dimension is relative to this. */
	base: UnitId;
	blurb: string;
	units: Unit[];
}

const u = (
	id: string,
	name: string,
	symbol: string,
	factor: number,
	aliases: string[] = [],
	extra: Partial<Unit> = {}
): Unit => ({ id, name, symbol, factor, aliases, ...extra });

// ---------------------------------------------------------------------------
// Length
// ---------------------------------------------------------------------------

const length: Dimension = {
	id: 'length',
	name: 'Length',
	base: 'meter',
	blurb: 'Distance and length, from nanometres to light-years.',
	units: [
		u('nanometer', 'nanometer', 'nm', 1e-9, ['nanometre', 'nanometers', 'nanometres']),
		u('micrometer', 'micrometer', 'µm', 1e-6, ['micrometre', 'micron', 'microns', 'um']),
		u('millimeter', 'millimeter', 'mm', 1e-3, ['millimetre', 'millimeters', 'millimetres']),
		u('centimeter', 'centimeter', 'cm', 1e-2, ['centimetre', 'centimeters', 'centimetres']),
		u('meter', 'meter', 'm', 1, ['metre', 'meters', 'metres']),
		u('kilometer', 'kilometer', 'km', 1000, ['kilometre', 'kilometers', 'kilometres', 'klick']),
		u('inch', 'inch', 'in', 0.0254, ['inches', '"', 'ins']),
		u('foot', 'foot', 'ft', 0.3048, ['feet', "'"], { plural: 'feet' }),
		u('yard', 'yard', 'yd', 0.9144, ['yards']),
		u('mile', 'mile', 'mi', 1609.344, ['miles']),
		u('nautical-mile', 'nautical mile', 'nmi', 1852, ['nautical miles', 'nm(nautical)']),
		u('furlong', 'furlong', 'fur', 201.168, ['furlongs']),
		u('fathom', 'fathom', 'ftm', 1.8288, ['fathoms']),
		u('hand', 'hand', 'hh', 0.1016, ['hands']),
		u('thou', 'thou', 'mil', 2.54e-5, ['mils', 'thousandth of an inch']),
		u('astronomical-unit', 'astronomical unit', 'AU', 1.495978707e11, ['au', 'astronomical units']),
		u('light-year', 'light-year', 'ly', 9.4607304725808e15, ['lightyear', 'light years', 'ly']),
		u('parsec', 'parsec', 'pc', 3.0856775814913673e16, ['parsecs'])
	]
};

// ---------------------------------------------------------------------------
// Mass
// ---------------------------------------------------------------------------

const mass: Dimension = {
	id: 'mass',
	name: 'Weight & mass',
	base: 'kilogram',
	blurb: 'Grams, pounds, ounces, stones and tonnes.',
	units: [
		u('microgram', 'microgram', 'µg', 1e-9, ['micrograms', 'mcg', 'ug']),
		u('milligram', 'milligram', 'mg', 1e-6, ['milligrams']),
		u('gram', 'gram', 'g', 1e-3, ['grams', 'gramme', 'grammes']),
		u('kilogram', 'kilogram', 'kg', 1, ['kilograms', 'kilo', 'kilos', 'kilogramme']),
		u('tonne', 'tonne', 't', 1000, ['metric ton', 'tonnes', 'metric tons', 'megagram']),
		u('ounce', 'ounce', 'oz', 0.028349523125, ['ounces']),
		u('pound', 'pound', 'lb', 0.45359237, ['pounds', 'lbs']),
		u('stone', 'stone', 'st', 6.35029318, ['stones'], { plural: 'stone' }),
		u('short-ton', 'short ton', 'ton (US)', 907.18474, ['us ton', 'short tons']),
		u('long-ton', 'long ton', 'ton (UK)', 1016.0469088, ['imperial ton', 'long tons']),
		u('carat', 'carat', 'ct', 0.0002, ['carats']),
		u('grain', 'grain', 'gr', 6.479891e-5, ['grains']),
		u('troy-ounce', 'troy ounce', 'ozt', 0.0311034768, ['troy ounces'])
	]
};

// ---------------------------------------------------------------------------
// Volume
// ---------------------------------------------------------------------------

const volume: Dimension = {
	id: 'volume',
	name: 'Volume',
	base: 'liter',
	blurb: 'Litres, gallons, cups, tablespoons and teaspoons — with the US/UK differences handled explicitly.',
	units: [
		u('milliliter', 'milliliter', 'mL', 1e-3, ['millilitre', 'milliliters', 'millilitres', 'ml', 'cc']),
		u('centiliter', 'centiliter', 'cL', 1e-2, ['centilitre', 'centiliters']),
		u('deciliter', 'deciliter', 'dL', 0.1, ['decilitre', 'deciliters']),
		u('liter', 'liter', 'L', 1, ['litre', 'liters', 'litres', 'l']),
		u('cubic-centimeter', 'cubic centimeter', 'cm³', 1e-3, ['cubic centimetre', 'cc', 'cm3']),
		u('cubic-meter', 'cubic meter', 'm³', 1000, ['cubic metre', 'm3', 'kilolitre']),
		u('cubic-inch', 'cubic inch', 'in³', 0.016387064, ['cubic inches', 'in3', 'ci']),
		u('cubic-foot', 'cubic foot', 'ft³', 28.316846592, ['cubic feet', 'ft3'], { plural: 'cubic feet' }),
		u('teaspoon', 'teaspoon', 'tsp', 0.00492892159375, ['teaspoons', 'tsp', 'tsps', 't'], {
			note: 'US teaspoon (1/6 US fl oz)'
		}),
		u('tablespoon', 'tablespoon', 'tbsp', 0.01478676478125, ['tablespoons', 'tbs', 'tbsp', 'T'], {
			note: 'US tablespoon = 3 US teaspoons'
		}),
		u('fluid-ounce', 'fluid ounce', 'fl oz', 0.0295735295625, ['fluid ounces', 'floz', 'fl. oz.'], {
			note: 'US customary fluid ounce'
		}),
		u('cup', 'cup', 'cup', 0.2365882365, ['cups'], { note: 'US legal-ish cup = 8 US fl oz = 236.588 mL' }),
		u('pint', 'pint', 'pt', 0.473176473, ['pints'], { note: 'US liquid pint' }),
		u('quart', 'quart', 'qt', 0.946352946, ['quarts'], { note: 'US liquid quart' }),
		u('gallon', 'gallon', 'gal', 3.785411784, ['gallons'], { note: 'US liquid gallon' }),
		u('imperial-teaspoon', 'imperial teaspoon', 'tsp (UK)', 0.0059193888, ['uk teaspoon']),
		u('imperial-tablespoon', 'imperial tablespoon', 'tbsp (UK)', 0.0177581640625, ['uk tablespoon']),
		u('imperial-fluid-ounce', 'imperial fluid ounce', 'fl oz (UK)', 0.0284130625, ['uk fluid ounce']),
		u('imperial-cup', 'imperial cup', 'cup (UK)', 0.284130625, ['uk cup'], {
			note: 'UK cup = 10 imperial fl oz'
		}),
		u('metric-cup', 'metric cup', 'cup (metric)', 0.25, ['australian cup', 'metric cups'], {
			note: 'Australia / NZ / metric recipes: exactly 250 mL'
		}),
		u('imperial-pint', 'imperial pint', 'pt (UK)', 0.56826125, ['uk pint']),
		u('imperial-quart', 'imperial quart', 'qt (UK)', 1.1365225, ['uk quart']),
		u('imperial-gallon', 'imperial gallon', 'gal (UK)', 4.54609, ['uk gallon']),
		u('stick-of-butter', 'stick of butter', 'stick', 0.11829411825, ['sticks of butter', 'butter stick'], {
			plural: 'sticks of butter',
			note: '1 US stick = 1/2 cup = 8 tbsp'
		}),
		u('barrel-oil', 'oil barrel', 'bbl', 158.987294928, ['barrels of oil', 'petroleum barrel'])
	]
};

// ---------------------------------------------------------------------------
// Temperature (affine)
// ---------------------------------------------------------------------------

const temperature: Dimension = {
	id: 'temperature',
	name: 'Temperature',
	base: 'kelvin',
	blurb: 'Celsius, Fahrenheit, Kelvin and Rankine.',
	units: [
		{
			id: 'celsius',
			name: 'degree Celsius',
			plural: 'degrees Celsius',
			symbol: '°C',
			factor: 1,
			aliases: ['c', 'centigrade', '°c', 'celcius'],
			toBase: (v) => v + 273.15,
			fromBase: (v) => v - 273.15
		},
		{
			id: 'fahrenheit',
			name: 'degree Fahrenheit',
			plural: 'degrees Fahrenheit',
			symbol: '°F',
			factor: 1,
			aliases: ['f', '°f', 'farenheit'],
			toBase: (v) => ((v - 32) * 5) / 9 + 273.15,
			fromBase: (v) => ((v - 273.15) * 9) / 5 + 32
		},
		{
			id: 'kelvin',
			name: 'kelvin',
			plural: 'kelvin',
			symbol: 'K',
			factor: 1,
			aliases: ['k', 'degrees kelvin'],
			toBase: (v) => v,
			fromBase: (v) => v
		},
		{
			id: 'rankine',
			name: 'degree Rankine',
			plural: 'degrees Rankine',
			symbol: '°R',
			factor: 1,
			aliases: ['r', '°r'],
			toBase: (v) => (v * 5) / 9,
			fromBase: (v) => (v * 9) / 5
		}
	]
};

// ---------------------------------------------------------------------------
// Area
// ---------------------------------------------------------------------------

const area: Dimension = {
	id: 'area',
	name: 'Area',
	base: 'square-meter',
	blurb: 'Square metres, square feet, acres and hectares.',
	units: [
		u('square-millimeter', 'square millimeter', 'mm²', 1e-6, ['sq mm', 'mm2']),
		u('square-centimeter', 'square centimeter', 'cm²', 1e-4, ['sq cm', 'cm2']),
		u('square-meter', 'square meter', 'm²', 1, ['square metre', 'sq m', 'm2']),
		u('square-kilometer', 'square kilometer', 'km²', 1e6, ['sq km', 'km2']),
		u('square-inch', 'square inch', 'in²', 0.00064516, ['sq in', 'in2', 'square inches']),
		u('square-foot', 'square foot', 'ft²', 0.09290304, ['sq ft', 'ft2', 'square feet'], {
			plural: 'square feet'
		}),
		u('square-yard', 'square yard', 'yd²', 0.83612736, ['sq yd', 'yd2']),
		u('square-mile', 'square mile', 'mi²', 2589988.110336, ['sq mi', 'mi2']),
		u('acre', 'acre', 'ac', 4046.8564224, ['acres']),
		u('hectare', 'hectare', 'ha', 10000, ['hectares']),
		u('are', 'are', 'a', 100, ['ares'])
	]
};

// ---------------------------------------------------------------------------
// Speed
// ---------------------------------------------------------------------------

const speed: Dimension = {
	id: 'speed',
	name: 'Speed',
	base: 'meter-per-second',
	blurb: 'mph, km/h, knots, and the speed of sound.',
	units: [
		u('meter-per-second', 'meter per second', 'm/s', 1, ['mps', 'metres per second', 'm/s']),
		u('kilometer-per-hour', 'kilometer per hour', 'km/h', 1 / 3.6, ['kph', 'kmh', 'kilometres per hour']),
		u('mile-per-hour', 'mile per hour', 'mph', 0.44704, ['miles per hour', 'mi/h']),
		u('foot-per-second', 'foot per second', 'ft/s', 0.3048, ['fps', 'feet per second']),
		u('knot', 'knot', 'kn', 0.514444444444, ['knots', 'kt', 'kts']),
		u('mach', 'mach', 'Ma', 340.29, ['machs'], { note: 'Speed of sound at sea level, 15 °C' })
	]
};

// ---------------------------------------------------------------------------
// Digital storage
// ---------------------------------------------------------------------------

const data: Dimension = {
	id: 'data',
	name: 'Digital storage',
	base: 'byte',
	blurb: 'Bytes, kilobytes and kibibytes — the decimal/binary difference, made explicit.',
	units: [
		u('bit', 'bit', 'b', 0.125, ['bits']),
		u('byte', 'byte', 'B', 1, ['bytes']),
		u('kilobit', 'kilobit', 'kb', 125, ['kilobits']),
		u('kilobyte', 'kilobyte', 'kB', 1000, ['kilobytes'], { note: 'Decimal: 1 kB = 1000 bytes' }),
		u('kibibyte', 'kibibyte', 'KiB', 1024, ['kibibytes'], { note: 'Binary: 1 KiB = 1024 bytes' }),
		u('megabit', 'megabit', 'Mb', 125000, ['megabits']),
		u('megabyte', 'megabyte', 'MB', 1e6, ['megabytes'], { note: 'Decimal: 1 MB = 1,000,000 bytes' }),
		u('mebibyte', 'mebibyte', 'MiB', 1048576, ['mebibytes']),
		u('gigabit', 'gigabit', 'Gb', 1.25e8, ['gigabits']),
		u('gigabyte', 'gigabyte', 'GB', 1e9, ['gigabytes']),
		u('gibibyte', 'gibibyte', 'GiB', 1073741824, ['gibibytes']),
		u('terabyte', 'terabyte', 'TB', 1e12, ['terabytes']),
		u('tebibyte', 'tebibyte', 'TiB', 1099511627776, ['tebibytes']),
		u('petabyte', 'petabyte', 'PB', 1e15, ['petabytes']),
		u('pebibyte', 'pebibyte', 'PiB', 1125899906842624, ['pebibytes'])
	]
};

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

const time: Dimension = {
	id: 'time',
	name: 'Time',
	base: 'second',
	blurb: 'Seconds through centuries.',
	units: [
		u('nanosecond', 'nanosecond', 'ns', 1e-9, ['nanoseconds']),
		u('microsecond', 'microsecond', 'µs', 1e-6, ['microseconds', 'us']),
		u('millisecond', 'millisecond', 'ms', 1e-3, ['milliseconds']),
		u('second', 'second', 's', 1, ['seconds', 'sec', 'secs']),
		u('minute', 'minute', 'min', 60, ['minutes', 'mins']),
		u('hour', 'hour', 'h', 3600, ['hours', 'hr', 'hrs']),
		u('day', 'day', 'd', 86400, ['days']),
		u('week', 'week', 'wk', 604800, ['weeks']),
		u('fortnight', 'fortnight', 'fortnight', 1209600, ['fortnights']),
		u('month', 'month', 'mo', 2629746, ['months'], { note: 'Average Gregorian month = 30.436875 days' }),
		u('year', 'year', 'yr', 31556952, ['years'], { note: 'Average Gregorian year = 365.2425 days' }),
		u('decade', 'decade', 'decade', 315569520, ['decades']),
		u('century', 'century', 'century', 3155695200, ['centuries'], { plural: 'centuries' })
	]
};

// ---------------------------------------------------------------------------
// Pressure, energy, power, angle, frequency, fuel economy
// ---------------------------------------------------------------------------

const pressure: Dimension = {
	id: 'pressure',
	name: 'Pressure',
	base: 'pascal',
	blurb: 'PSI, bar, pascals and atmospheres — including tyre pressure.',
	units: [
		u('pascal', 'pascal', 'Pa', 1, ['pascals']),
		u('hectopascal', 'hectopascal', 'hPa', 100, ['hectopascals']),
		u('kilopascal', 'kilopascal', 'kPa', 1000, ['kilopascals']),
		u('megapascal', 'megapascal', 'MPa', 1e6, ['megapascals']),
		u('bar', 'bar', 'bar', 100000, ['bars']),
		u('millibar', 'millibar', 'mbar', 100, ['millibars']),
		u('psi', 'pound per square inch', 'psi', 6894.757293168, ['psi', 'lbf/in2']),
		u('atmosphere', 'atmosphere', 'atm', 101325, ['atmospheres', 'standard atmosphere']),
		u('torr', 'torr', 'Torr', 133.32236842105263, ['torrs']),
		u('mmhg', 'millimeter of mercury', 'mmHg', 133.322387415, ['mm hg']),
		u('inhg', 'inch of mercury', 'inHg', 3386.388640341, ['in hg'])
	]
};

const energy: Dimension = {
	id: 'energy',
	name: 'Energy',
	base: 'joule',
	blurb: 'Joules, calories, kilowatt-hours and BTU.',
	units: [
		u('joule', 'joule', 'J', 1, ['joules']),
		u('kilojoule', 'kilojoule', 'kJ', 1000, ['kilojoules']),
		u('calorie', 'calorie', 'cal', 4.184, ['calories', 'small calorie'], {
			note: 'Thermochemical calorie'
		}),
		u('kilocalorie', 'kilocalorie', 'kcal', 4184, ['kilocalories', 'food calorie', 'Calorie'], {
			note: 'The "calorie" on nutrition labels'
		}),
		u('watt-hour', 'watt-hour', 'Wh', 3600, ['watt hours', 'wh']),
		u('kilowatt-hour', 'kilowatt-hour', 'kWh', 3.6e6, ['kilowatt hours', 'kwh']),
		u('electronvolt', 'electronvolt', 'eV', 1.602176634e-19, ['electron volt', 'ev']),
		u('btu', 'British thermal unit', 'BTU', 1055.05585262, ['btus', 'british thermal units']),
		u('therm', 'therm', 'thm', 1.05505585262e8, ['therms']),
		u('foot-pound', 'foot-pound', 'ft·lb', 1.3558179483314004, ['foot pounds', 'ftlb'])
	]
};

const power: Dimension = {
	id: 'power',
	name: 'Power',
	base: 'watt',
	blurb: 'Watts, horsepower and BTU per hour.',
	units: [
		u('milliwatt', 'milliwatt', 'mW', 1e-3, ['milliwatts']),
		u('watt', 'watt', 'W', 1, ['watts']),
		u('kilowatt', 'kilowatt', 'kW', 1000, ['kilowatts']),
		u('megawatt', 'megawatt', 'MW', 1e6, ['megawatts']),
		u('gigawatt', 'gigawatt', 'GW', 1e9, ['gigawatts']),
		u('horsepower', 'mechanical horsepower', 'hp', 745.6998715822702, ['hp', 'horsepowers']),
		u('metric-horsepower', 'metric horsepower', 'PS', 735.49875, ['ps', 'cv']),
		u('btu-per-hour', 'BTU per hour', 'BTU/h', 0.29307107017, ['btu/h', 'btuh'])
	]
};

const angle: Dimension = {
	id: 'angle',
	name: 'Angle',
	base: 'radian',
	blurb: 'Degrees, radians, gradians and turns.',
	units: [
		u('radian', 'radian', 'rad', 1, ['radians', 'rad']),
		u('degree', 'degree', '°', Math.PI / 180, ['degrees', 'deg']),
		u('gradian', 'gradian', 'grad', Math.PI / 200, ['gradians', 'gon']),
		u('turn', 'turn', 'turn', 2 * Math.PI, ['turns', 'revolution', 'revolutions']),
		u('arcminute', 'arcminute', "'", Math.PI / 10800, ['arcminutes', 'minute of arc']),
		u('arcsecond', 'arcsecond', '"', Math.PI / 648000, ['arcseconds', 'second of arc']),
		u('milliradian', 'milliradian', 'mrad', 1e-3, ['milliradians', 'mil'])
	]
};

const frequency: Dimension = {
	id: 'frequency',
	name: 'Frequency',
	base: 'hertz',
	blurb: 'Hertz through gigahertz, plus RPM.',
	units: [
		u('hertz', 'hertz', 'Hz', 1, ['hz'], { plural: 'hertz' }),
		u('kilohertz', 'kilohertz', 'kHz', 1000, ['khz'], { plural: 'kilohertz' }),
		u('megahertz', 'megahertz', 'MHz', 1e6, ['mhz'], { plural: 'megahertz' }),
		u('gigahertz', 'gigahertz', 'GHz', 1e9, ['ghz'], { plural: 'gigahertz' }),
		u('rpm', 'revolution per minute', 'rpm', 1 / 60, ['rpm', 'revolutions per minute'])
	]
};

const fuel: Dimension = {
	id: 'fuel-economy',
	name: 'Fuel economy',
	base: 'kilometer-per-liter',
	blurb: 'MPG and litres per 100 km. Note that L/100 km is inverse — lower is better.',
	units: [
		u('kilometer-per-liter', 'kilometer per liter', 'km/L', 1, ['kmpl', 'km/l']),
		u('mile-per-gallon-us', 'mile per US gallon', 'mpg (US)', 0.4251437074976, ['mpg', 'miles per gallon']),
		u('mile-per-gallon-uk', 'mile per imperial gallon', 'mpg (UK)', 0.35400619, ['uk mpg', 'imperial mpg']),
		{
			id: 'liter-per-100km',
			name: 'liter per 100 km',
			plural: 'liters per 100 km',
			symbol: 'L/100km',
			factor: 1,
			aliases: ['l/100km', 'litres per 100 km', 'l per 100 km'],
			toBase: (v) => (v === 0 ? Infinity : 100 / v),
			fromBase: (v) => (v === 0 ? Infinity : 100 / v),
			note: 'Inverse measure — lower is better'
		}
	]
};

const dataRate: Dimension = {
	id: 'data-rate',
	name: 'Data transfer rate',
	base: 'bit-per-second',
	blurb: 'Mbps, MB/s and the 8× confusion between them.',
	units: [
		u('bit-per-second', 'bit per second', 'bps', 1, ['bps', 'bits per second']),
		u('kilobit-per-second', 'kilobit per second', 'kbps', 1000, ['kbps', 'kbit/s']),
		u('megabit-per-second', 'megabit per second', 'Mbps', 1e6, ['mbps', 'mbit/s', 'mb/s']),
		u('gigabit-per-second', 'gigabit per second', 'Gbps', 1e9, ['gbps', 'gbit/s']),
		u('byte-per-second', 'byte per second', 'B/s', 8, ['bytes per second']),
		u('kilobyte-per-second', 'kilobyte per second', 'kB/s', 8000, ['kb/s', 'kbyte/s']),
		u('megabyte-per-second', 'megabyte per second', 'MB/s', 8e6, ['mbyte/s', 'megabytes per second']),
		u('gigabyte-per-second', 'gigabyte per second', 'GB/s', 8e9, ['gbyte/s'])
	]
};

const density: Dimension = {
	id: 'density',
	name: 'Density',
	base: 'kilogram-per-cubic-meter',
	blurb: 'Grams per millilitre, pounds per cubic foot and friends.',
	units: [
		u('kilogram-per-cubic-meter', 'kilogram per cubic meter', 'kg/m³', 1, ['kg/m3']),
		u('gram-per-cubic-centimeter', 'gram per cubic centimeter', 'g/cm³', 1000, ['g/cm3', 'g/ml', 'g/mL']),
		u('kilogram-per-liter', 'kilogram per liter', 'kg/L', 1000, ['kg/l']),
		u('pound-per-cubic-foot', 'pound per cubic foot', 'lb/ft³', 16.018463373960143, ['lb/ft3', 'pcf']),
		u('pound-per-gallon-us', 'pound per US gallon', 'lb/gal', 119.82642731689663, ['ppg']),
		u('ounce-per-cubic-inch', 'ounce per cubic inch', 'oz/in³', 1729.9940439319, ['oz/in3'])
	]
};

const force: Dimension = {
	id: 'force',
	name: 'Force',
	base: 'newton',
	blurb: 'Newtons, pounds-force and kilograms-force.',
	units: [
		u('newton', 'newton', 'N', 1, ['newtons']),
		u('kilonewton', 'kilonewton', 'kN', 1000, ['kilonewtons']),
		u('dyne', 'dyne', 'dyn', 1e-5, ['dynes']),
		u('pound-force', 'pound-force', 'lbf', 4.4482216152605, ['lbf', 'pounds force']),
		u('kilogram-force', 'kilogram-force', 'kgf', 9.80665, ['kgf', 'kilopond'])
	]
};

export const DIMENSIONS: Dimension[] = [
	length,
	mass,
	volume,
	temperature,
	area,
	speed,
	time,
	data,
	dataRate,
	pressure,
	energy,
	power,
	angle,
	frequency,
	fuel,
	density,
	force
];

export const DIMENSION_BY_ID = new Map(DIMENSIONS.map((d) => [d.id, d]));

// ---------------------------------------------------------------------------
// Lookup + conversion
// ---------------------------------------------------------------------------

export interface UnitRef {
	dimension: Dimension;
	unit: Unit;
}

const unitIndex = new Map<string, UnitRef>();
const ambiguous = new Set<string>();

function register(key: string, ref: UnitRef) {
	const k = key.trim().toLowerCase();
	if (!k) return;
	if (unitIndex.has(k)) {
		// A collision between two dimensions (e.g. "t" for tonne and turn) makes
		// the token ambiguous; the omnibox refuses to guess.
		const existing = unitIndex.get(k)!;
		if (existing.unit.id !== ref.unit.id) ambiguous.add(k);
		return;
	}
	unitIndex.set(k, ref);
}

for (const dimension of DIMENSIONS) {
	for (const unit of dimension.units) {
		const ref = { dimension, unit };
		register(unit.id, ref);
		register(unit.id.replace(/-/g, ' '), ref);
		register(unit.name, ref);
		register(unit.plural ?? unit.name + 's', ref);
		register(unit.symbol, ref);
		for (const alias of unit.aliases ?? []) register(alias, ref);
	}
}

/** Resolve a free-text unit token ("tbsp", "kilometres", "°F") to a unit. */
export function findUnit(token: string): UnitRef | undefined {
	const key = token.trim().toLowerCase().replace(/\.$/, '');
	if (ambiguous.has(key)) return undefined;
	return unitIndex.get(key) ?? unitIndex.get(key.replace(/s$/, ''));
}

/** Resolve a unit id within a known dimension. */
export function unitIn(dimension: Dimension, id: string): Unit | undefined {
	return dimension.units.find((x) => x.id === id);
}

export function toBase(unit: Unit, value: number): number {
	return unit.toBase ? unit.toBase(value) : value * unit.factor;
}

export function fromBase(unit: Unit, value: number): number {
	return unit.fromBase ? unit.fromBase(value) : value / unit.factor;
}

/** Convert between two units of the same dimension. */
export function convert(value: number, from: Unit, to: Unit): number {
	if (from.id === to.id) return value;
	return fromBase(to, toBase(from, value));
}

/** The plural-aware label for a quantity: 1 "foot", 2 "feet". */
export function unitLabel(unit: Unit, value: number): string {
	if (Math.abs(value) === 1) return unit.name;
	return unit.plural ?? unit.name + 's';
}

/** Human-readable formula string shown in the "show the work" panel. */
export function conversionFormula(from: Unit, to: Unit): string {
	if (from.toBase || to.toBase) {
		if (from.id === 'celsius' && to.id === 'fahrenheit') return '°F = °C × 9/5 + 32';
		if (from.id === 'fahrenheit' && to.id === 'celsius') return '°C = (°F − 32) × 5/9';
		if (from.id === 'celsius' && to.id === 'kelvin') return 'K = °C + 273.15';
		if (from.id === 'kelvin' && to.id === 'celsius') return '°C = K − 273.15';
		if (from.id === 'liter-per-100km' || to.id === 'liter-per-100km')
			return 'L/100km = 235.215 ÷ mpg (US)  ·  the two are reciprocals';
		return `Convert ${from.symbol} → base → ${to.symbol}`;
	}
	const ratio = from.factor / to.factor;
	return `1 ${from.symbol} = ${formatNumber(ratio, 8)} ${to.symbol}`;
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

/**
 * Format a result for display: keep it readable, never print 15 digits of
 * float noise, and fall back to scientific notation at the extremes.
 */
export function formatNumber(value: number, maxSignificant = 10): string {
	if (!Number.isFinite(value)) return Number.isNaN(value) ? '—' : value > 0 ? '∞' : '−∞';
	if (value === 0) return '0';
	const abs = Math.abs(value);
	if (abs >= 1e15 || abs < 1e-7) {
		return value.toExponential(Math.min(maxSignificant, 6)).replace(/e([+-])/, ' × 10^');
	}
	const rounded = Number(value.toPrecision(maxSignificant));
	return rounded.toLocaleString('en-US', { maximumFractionDigits: 20 });
}

/** Round to a fixed number of significant figures. */
export function toSignificant(value: number, digits: number): number {
	if (value === 0 || !Number.isFinite(value)) return value;
	return Number(value.toPrecision(Math.max(1, Math.min(21, digits))));
}
