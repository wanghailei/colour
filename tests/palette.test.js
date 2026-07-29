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
test( "default chroma is the house 0.150", () => {
	assert.equal( defaultSettings.chroma, 0.15 )
} )
test( "default grid is 20 lightness steps by 12 hues from 25°", () => {
	assert.equal( defaultSettings.lightnessCount, 20 )
	assert.equal( defaultSettings.hueCount, 12 )
	assert.equal( defaultSettings.hueStart, 25 )
} )

// ---------------------------------------------------------------
// Print references — approximations, clearly derived
// ---------------------------------------------------------------
test( "device CMYK of white, black, red", () => {
	assert.deepEqual( approximateCmyk( "#ffffff" ), [ 0, 0, 0, 0 ] )
	assert.deepEqual( approximateCmyk( "#000000" ), [ 0, 0, 0, 100 ] )
	assert.deepEqual( approximateCmyk( "#ff0000" ), [ 0, 100, 100, 0 ] )
} )
test( "hex to OKLab: white is L1 a0 b0", () => {
	const lab = hexToOklab( "#ffffff" )
	assert.ok( Math.abs( lab.L - 1 ) < 1e-3 )
	assert.ok( Math.abs( lab.a ) < 1e-3 )
	assert.ok( Math.abs( lab.b ) < 1e-3 )
} )
test( "nearest PT reference picks the closest table entry", () => {
	ptTable = { "PT RED": "#ff0000", "PT BLUE": "#0000ff" }
	assert.equal( nearestPtReference( "#f80402" ), "PT RED" )
	assert.equal( nearestPtReference( "#0004f8" ), "PT BLUE" )
	ptTable = null
} )
test( "no sidecar table, no PT reference", () => {
	assert.equal( nearestPtReference( "#ff0000" ), null )
} )

// ---------------------------------------------------------------
// Exports — derived from the model, filenames state their origin
// ---------------------------------------------------------------
test( "filename states the three settings", () => {
	Object.assign( settings, defaultSettings )
	assert.equal( exportName( "json" ), "whl_colours_palette_20_0.150_12.json" )
} )
test( "a column selection is named by its hue", () => {
	Object.assign( settings, defaultSettings )
	selection = { kind: "column", index: 0 }
	assert.equal( svgCells( buildFamilies() ).name, "whl_colours_palette_20_0.150_12_hue25.svg" )
	selection = null
} )
test( "a row selection is named by its lightness", () => {
	Object.assign( settings, defaultSettings )
	selection = { kind: "row", index: 12 }
	assert.equal( svgCells( buildFamilies() ).name, "whl_colours_palette_20_0.150_12_light62.svg" )
	selection = null
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
	assert.equal( palette.families.length, 12 )
	palette.families.forEach( ( family ) => {
		Object.values( family.steps ).forEach( ( value ) => {
			assert.match( value, /^#[0-9a-f]{6}$/ )
		} )
	} )
} )
test( "JSON carries approximate print references per step", () => {
	Object.assign( settings, defaultSettings )
	ptTable = { "PT RED": "#ff0000" }
	const palette = gatherPalette()
	const family = palette.families[0]
	Object.values( family.print ).forEach( ( reference ) => {
		assert.equal( reference.cmyk.length, 4 )
		assert.equal( typeof reference.pt, "string" )
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
