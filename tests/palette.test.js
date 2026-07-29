/* Assertions over the extracted pure layer of whl_colours_palette.html.
   Concatenated after the extraction by tests/run.sh — the palette's own
   functions and settings are in scope. Behaviour under test, not
   implementation: every check states a promise the spec makes. */
const assert = require( "node:assert" )

let testCount = 0
function test( name, body ) {
	testCount += 1
	try {
		body()
	} catch ( error ) {
		console.error( "FAIL: " + name )
		console.error( error.message )
		process.exit( 1 )
	}
}

// ---------------------------------------------------------------
// Round-trip — the sRGB primaries survive OKLCH → hex conversion
// ---------------------------------------------------------------
test( "red primary round-trips", () => {
	assert.equal( oklchToHex( 0.628, 0.2577, 29.23 ).hex, "#ff0000" )
} )
test( "green primary round-trips", () => {
	assert.equal( oklchToHex( 0.8664, 0.2948, 142.5 ).hex, "#00ff00" )
} )
test( "blue primary round-trips", () => {
	assert.equal( oklchToHex( 0.452, 0.3132, 264.05 ).hex, "#0000ff" )
} )
test( "zero chroma at full lightness is white", () => {
	assert.equal( oklchToHex( 1, 0, 0 ).hex, "#ffffff" )
} )
test( "zero chroma at zero lightness is black", () => {
	assert.equal( oklchToHex( 0, 0, 0 ).hex, "#000000" )
} )

// ---------------------------------------------------------------
// Gamut clamp — honest, monotone, and always inside sRGB
// ---------------------------------------------------------------
test( "clamp never raises the requested chroma", () => {
	for ( let hue = 0; hue < 360; hue += 15 ) {
		const clamped = clampChroma( 0.5, 0.32, hue )
		assert.ok( clamped.chroma <= 0.32 )
	}
} )
test( "clamped result is in gamut", () => {
	for ( let hue = 0; hue < 360; hue += 15 ) {
		const clamped = clampChroma( 0.62, 0.32, hue )
		assert.ok( isInGamut( oklchToLinearRgb( 0.62, clamped.chroma, hue ) ) )
	}
} )
test( "clamp is monotone in the requested chroma", () => {
	// tolerance matches the binary search's convergence: requested / 2^22
	let previous = 0
	for ( let requested = 0.05; requested <= 0.32; requested += 0.01 ) {
		const clamped = clampChroma( 0.55, requested, 264 ).chroma
		assert.ok( clamped >= previous - 1e-6 )
		previous = clamped
	}
} )
test( "in-gamut colours pass through unclamped", () => {
	assert.equal( clampChroma( 0.5, 0.05, 25 ).clamped, false )
} )

// ---------------------------------------------------------------
// Lightness ladder — even rungs strictly between black and white
// ---------------------------------------------------------------
test( "ladder steps are even and strictly interior", () => {
	settings.lightnessCount = 20
	const steps = []
	for ( let index = 0; index < settings.lightnessCount; index++ ) steps.push( lightnessAt( index ) )
	assert.ok( steps[0] > 0 )
	assert.ok( steps[steps.length - 1] < 1 )
	const gap = steps[1] - steps[0]
	for ( let index = 1; index < steps.length; index++ ) {
		assert.ok( Math.abs( steps[index] - steps[index - 1] - gap ) < 1e-12 )
	}
} )
test( "chroma breathes: full at mid-tones, gentle at the extremes", () => {
	settings.chroma = 0.15
	assert.ok( Math.abs( chromaAt( 0.5 ) - 0.15 ) < 1e-12 )
	assert.ok( Math.abs( chromaAt( 0 ) - 0.03 ) < 1e-12 )
	assert.ok( Math.abs( chromaAt( 1 ) - 0.03 ) < 1e-9 )
} )

// ---------------------------------------------------------------
// House defaults — the considered settings a fresh visitor gets
// ---------------------------------------------------------------
test( "house defaults match the Gradient's baked default swatch", () => {
	assert.equal( defaultSettings.lightnessCount, 18 )
	assert.equal( defaultSettings.chroma, 0.12 )
	assert.equal( defaultSettings.hueCount, 28 )
	assert.equal( defaultSettings.hueStart, 25 )
} )
test( "house defaults reproduce the baked default swatch exactly", () => {
	// fixtures lifted from the Gradient's swatch/default.json (hue 25);
	// verified identical across the full grid on 29 Jul 2026
	Object.assign( settings, defaultSettings )
	const steps = gatherPalette().families[0].steps
	assert.equal( steps["5"], "#030000" )
	assert.equal( steps["11"], "#0f0000" )
	assert.equal( steps["16"], "#220001" )
} )

// ---------------------------------------------------------------
// Print references — approximations, clearly derived
// ---------------------------------------------------------------
test( "device CMYK reads as one compact code", () => {
	assert.equal( approximateCmyk( "#ffffff" ), "C0 M0 Y0 K0" )
	assert.equal( approximateCmyk( "#000000" ), "C0 M0 Y0 K100" )
	assert.equal( approximateCmyk( "#ff0000" ), "C0 M100 Y100 K0" )
} )
test( "hex to OKLab: white is L1 a0 b0", () => {
	const lab = hexToOklab( "#ffffff" )
	assert.ok( Math.abs( lab.L - 1 ) < 1e-3 )
	assert.ok( Math.abs( lab.a ) < 1e-3 )
	assert.ok( Math.abs( lab.b ) < 1e-3 )
} )
test( "PT code carries the nearest coated and uncoated entries", () => {
	ptTable = {
		coated: { "7621": "#ff0000", "2935": "#0000ff" },
		uncoated: { "8509": "#fe0202" },
	}
	assert.equal( ptCode( "#f80402" ), "PC7621 PU8509" )
	assert.equal( ptCode( "#0004f8" ), "PC2935 PU8509" )
	ptTable = null
} )
test( "a single-substrate table yields a single PT code", () => {
	ptTable = { coated: { "186": "#c8102e" } }
	assert.equal( ptCode( "#c00f2c" ), "PC186" )
	ptTable = null
} )
test( "no sidecar table, no PT code", () => {
	assert.equal( ptCode( "#ff0000" ), null )
} )
test( "a dropped PT table parses and normalises", () => {
	const table = parsePtTable( '{ "coated": { "186": "#C8102E" }, "uncoated": { "485": "#da291c" }, "junk": 1 }' )
	assert.deepEqual( table, { coated: { "186": "#C8102E" }, uncoated: { "485": "#da291c" } } )
} )
test( "a single-substrate drop still parses", () => {
	const table = parsePtTable( '{ "coated": { "186": "#C8102E" } }' )
	assert.deepEqual( table, { coated: { "186": "#C8102E" } } )
} )
test( "garbage and shapeless drops are rejected", () => {
	assert.equal( parsePtTable( "not json" ), null )
	assert.equal( parsePtTable( '{ "a": "#ff0000" }' ), null )
	assert.equal( parsePtTable( '{ "coated": { "186": 42 } }' ), null )
	assert.equal( parsePtTable( '[1,2]' ), null )
} )
test( "named colours are excluded — numeric codes only", () => {
	// the owner's rule: a PT reference without a number is not shown;
	// what does not correspond is not forced to correspond
	const table = parsePtTable(
		'{ "coated": { "186": "#c8102e", "neutral-black": "#222222", "orange-021": "#fe5000" }, "uncoated": { "reflex-blue": "#001489" } }'
	)
	assert.deepEqual( table, { coated: { "186": "#c8102e" } } )
	ptTable = table
	assert.equal( ptCode( "#222222" ), "PC186" )
	ptTable = null
} )
test( "the SVG names its fonts the way design apps expect", () => {
	// PostScript name first (what Affinity and friends match), family
	// names after (what browsers match), no quotes anywhere — Affinity
	// reads a quoted list as one literal unknown font name.
	const svg = svgRectangles( [ { column: 0, row: 0, hex: "#123456", title: "5% 0.033 25" } ] )
	assert.ok( !svg.includes( "<style>" ) )
	assert.ok( !svg.includes( "@font-face" ) )
	assert.ok( !svg.includes( "'" ), "no quote characters anywhere in the SVG" )
	assert.ok( !svg.includes( "letter-spacing" ), "no letter-spacing attribute — importers choke on em units" )
	assert.ok(
		svg.includes(
			'font-family="BerkeleyMonoVariable-Regular, Berkeley Mono Variable, Berkeley Mono, IBM Plex Mono, JetBrains Mono, monospace"'
		)
	)
} )

// ---------------------------------------------------------------
// Exports — derived from the model, filenames state their origin
// ---------------------------------------------------------------
test( "filename states the three settings", () => {
	Object.assign( settings, defaultSettings )
	assert.equal( exportName( "json" ), "whl_colours_palette_18_0.120_28.json" )
} )
test( "a column selection is named by its hue", () => {
	Object.assign( settings, defaultSettings )
	selection = { kind: "column", index: 0 }
	assert.equal( svgCells( buildFamilies() ).name, "whl_colours_palette_18_0.120_28_h25.svg" )
	selection = null
} )
test( "a row selection is named by its lightness", () => {
	Object.assign( settings, defaultSettings )
	selection = { kind: "row", index: 12 }
	assert.equal( svgCells( buildFamilies() ).name, "whl_colours_palette_18_0.120_28_l68.svg" )
	selection = null
} )
test( "SVG colour cells carry title, hex, cmyk and pt, in their ink", () => {
	Object.assign( settings, defaultSettings )
	selection = null
	ptTable = { coated: { "186": "#c8102e" }, uncoated: { "485": "#da291c" } }
	const families = buildFamilies()
	const svg = svgRectangles( svgCells( families ).cells )
	const sample = families[0].cells[10]
	assert.ok( svg.includes( ">" + sample.title + "<" ) )
	assert.ok( svg.includes( ">" + sample.hex.toUpperCase() + "<" ) )
	assert.ok( svg.includes( ">" + approximateCmyk( sample.hex ) + "<" ) )
	// numeric-only codes fit side by side: one PT line, PC then PU
	assert.ok( svg.includes( ">" + ptCode( sample.hex ) + "<" ) )
	assert.ok( svg.includes( `fill="${inkFor( sample.hex )}"` ) )
	ptTable = null
} )
test( "SVG text mirrors the UI: 12px, weight 400, left 16, tops 12/31/50/69", () => {
	// design tools ignore attributes inherited from groups, so every text
	// element must be self-contained — same size, same grid as the UI cell
	Object.assign( settings, defaultSettings )
	selection = null
	ptTable = { coated: { "186": "#c8102e" } }
	const svg = svgRectangles( svgCells( buildFamilies() ).cells )
	const texts = svg.match( /<text [^>]*>/g )
	assert.ok( texts.length > 0 )
	texts.forEach( ( tag ) => {
		assert.ok( tag.includes( 'font-size="12"' ), "self-contained size: " + tag )
		assert.ok( tag.includes( 'font-weight="400"' ), "self-contained weight: " + tag )
		assert.ok( tag.includes( "BerkeleyMonoVariable-Regular, Berkeley Mono Variable" ), "PostScript-first family list: " + tag )
		const x = Number( tag.match( / x="(\d+)"/ )[1] )
		assert.equal( ( x - 16 ) % 150, 0, "left margin 16 inside a 150 cell: " + tag )
	} )
	// baselines: UI tops 12/31/50/69 + 10 ascent = 22/41/60/79 within every
	// cell — numeric-only PT codes (max PC9999 PU9999, 13 chars ≈ 110 of
	// 150 units) fit on one line
	texts.forEach( ( tag ) => {
		const y = Number( tag.match( / y="(\d+)"/ )[1] )
		assert.ok( [ 22, 41, 60, 79 ].includes( y % 150 ), "baseline on the UI grid: " + tag )
	} )
	ptTable = null
} )
test( "SVG values sit in per-kind groups inside one top values layer", () => {
	Object.assign( settings, defaultSettings )
	selection = null
	ptTable = { coated: { "186": "#c8102e" } }
	const svg = svgRectangles( svgCells( buildFamilies() ).cells )
	;[ "values", "oklch", "hex", "cmyk", "pt" ].forEach( ( id ) => {
		assert.ok( svg.includes( `<g id="${id}">` ), id + " group is purely structural" )
	} )
	// the values layer must sit above every colour plate: no rect after it
	const valuesAt = svg.indexOf( '<g id="values">' )
	assert.ok( valuesAt > svg.lastIndexOf( "<rect " ) )
	ptTable = null
} )
test( "SVG cell is 1:1 at twice the UI height", () => {
	const svg = svgRectangles( [ { column: 0, row: 0, hex: "#123456" } ] )
	assert.ok( svg.includes( 'width="150" height="150"' ) )
} )
test( "SVG frame rows stay textless, pt appears only with a table", () => {
	Object.assign( settings, defaultSettings )
	selection = null
	const svg = svgRectangles( svgCells( buildFamilies() ).cells )
	const textCount = ( svg.match( /<text /g ) || [] ).length
	assert.equal( textCount, settings.hueCount * settings.lightnessCount * 3 )
	assert.ok( !svg.includes( '<g id="pt"' ) )
} )
test( "SVG cells are square — the canonical swatch form", () => {
	const svg = svgRectangles( [ { column: 0, row: 0, hex: "#123456" }, { column: 1, row: 0, hex: "#654321" } ] )
	const rect = svg.match( /<rect [^>]+>/ )[0]
	const width = rect.match( /width="(\d+)"/ )[1]
	const height = rect.match( /height="(\d+)"/ )[1]
	assert.equal( width, height )
} )
test( "full swatch SVG covers the grid plus the black and white rows", () => {
	Object.assign( settings, defaultSettings )
	selection = null
	const choice = svgCells( buildFamilies() )
	const svg = svgRectangles( choice.cells )
	const [ , canvasWidth, canvasHeight ] = svg.match( /viewBox="0 0 (\d+) (\d+)"/ )
	assert.equal( Number( canvasWidth ) / settings.hueCount, Number( canvasHeight ) / ( settings.lightnessCount + 2 ) )
} )
test( "JSON keeps the Gradient contract: steps are plain hex strings", () => {
	Object.assign( settings, defaultSettings )
	const palette = gatherPalette()
	assert.equal( palette.families.length, 28 )
	palette.families.forEach( ( family ) => {
		Object.values( family.steps ).forEach( ( value ) => {
			assert.match( value, /^#[0-9a-f]{6}$/ )
		} )
	} )
} )
test( "JSON carries approximate print references per step, one format", () => {
	Object.assign( settings, defaultSettings )
	ptTable = { coated: { "186": "#c8102e" }, uncoated: { "485": "#da291c" } }
	const palette = gatherPalette()
	const family = palette.families[0]
	Object.values( family.print ).forEach( ( reference ) => {
		assert.match( reference.cmyk, /^C\d{1,3} M\d{1,3} Y\d{1,3} K\d{1,3}$/ )
		assert.match( reference.pt, /^PC\S+ PU\S+$/ )
	} )
	ptTable = null
} )
test( "without the sidecar, print references carry CMYK only", () => {
	const palette = gatherPalette()
	Object.values( palette.families[0].print ).forEach( ( reference ) => {
		assert.equal( reference.pt, undefined )
	} )
} )

console.log( "PASS — " + testCount + " tests" )
