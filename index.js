/**
 * Shamir's Secret Sharing - Lagrange Interpolation
 * 
 * Problem:
 * - Given n points (x, y) of a polynomial of degree k-1
 * - The y-values are encoded in different bases
 * - Find the constant term f(0) using Lagrange Interpolation
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// STEP 1: Decode a value string from a given base to BigInt
// (We use BigInt to handle very large numbers accurately)
// ─────────────────────────────────────────────
function decodeValue(base, valueStr) {
    // BigInt version of parseInt for arbitrary bases
    const bigBase = BigInt(base);
    let result = 0n;
    for (const char of valueStr.toLowerCase()) {
        const digit = BigInt(parseInt(char, parseInt(base)));
        result = result * bigBase + digit;
    }
    return result;
}

// ─────────────────────────────────────────────
// STEP 2: Lagrange Interpolation to find f(0)
//
// Formula: f(0) = Σ [ y_i * Π_{j≠i} (0 - x_j) / (x_i - x_j) ]
//
// We use BigInt / rational arithmetic to keep precision.
// ─────────────────────────────────────────────
function lagrangeInterpolationAtZero(points) {
    // points = [ { x: BigInt, y: BigInt }, ... ]
    const n = points.length;

    // --- Rational arithmetic helpers ---
    function gcd(a, b) {
        a = a < 0n ? -a : a;
        b = b < 0n ? -b : b;
        while (b !== 0n) { [a, b] = [b, a % b]; }
        return a;
    }

    function simplify(num, den) {
        if (den < 0n) { num = -num; den = -den; }
        const g = gcd(num < 0n ? -num : num, den);
        return [num / g, den / g];
    }

    function addFrac([n1, d1], [n2, d2]) {
        return simplify(n1 * d2 + n2 * d1, d1 * d2);
    }

    function mulFrac([n1, d1], [n2, d2]) {
        return simplify(n1 * n2, d1 * d2);
    }

    let result = [0n, 1n]; // Start with 0 as fraction 0/1

    for (let i = 0; i < n; i++) {
        const xi = points[i].x;
        const yi = points[i].y;

        // Numerator: product of (0 - x_j) for j ≠ i
        // Denominator: product of (x_i - x_j) for j ≠ i
        let num = 1n;
        let den = 1n;

        for (let j = 0; j < n; j++) {
            if (i !== j) {
                const xj = points[j].x;
                num *= (0n - xj);      // (0 - x_j)
                den *= (xi - xj);      // (x_i - x_j)
            }
        }

        // Lagrange basis value L_i(0) = num / den (as fraction)
        let li = simplify(num, den);

        // Multiply by y_i: y_i * L_i(0)
        let term = mulFrac([yi, 1n], li);

        // Add to running result
        result = addFrac(result, term);
    }

    // result should be an integer (the constant term), so numerator / denominator
    if (result[1] !== 1n && result[1] !== -1n) {
        console.warn("⚠️  Result is not an exact integer — check the input!");
    }
    return result[0] / result[1];
}

// ─────────────────────────────────────────────
// STEP 3: Main function to process a JSON test case
// ─────────────────────────────────────────────
function processTestCase(filePath) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📂 Processing: ${path.basename(filePath)}`);
    console.log('═'.repeat(50));

    // Read and parse JSON
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const n = data.keys.n; // Total roots provided
    const k = data.keys.k; // Minimum roots needed (degree + 1)

    console.log(`🔑 n = ${n} (roots provided), k = ${k} (roots needed)`);
    console.log(`📐 Polynomial degree = ${k - 1}`);

    // Extract and decode the points
    const points = [];
    for (const key of Object.keys(data)) {
        if (key === 'keys') continue;

        const x = BigInt(key);                      // x is the key index
        const base = parseInt(data[key].base);
        const rawValue = data[key].value;
        const y = decodeValue(base, rawValue);       // decode y from given base

        console.log(`  Point x=${key}: base ${base}, encoded="${rawValue}" → decoded y=${y}`);
        points.push({ x, y });
    }

    // We only need k points for Lagrange interpolation (use first k)
    const selectedPoints = points.slice(0, k);
    console.log(`\n🔢 Using first ${k} points for interpolation...`);

    // Find f(0) — the secret / constant term
    const secret = lagrangeInterpolationAtZero(selectedPoints);

    console.log(`\n✅ SECRET (constant term f(0)) = ${secret}`);
    console.log('═'.repeat(50));

    return secret;
}

// ─────────────────────────────────────────────
// Run both test cases
// ─────────────────────────────────────────────
const testCase1Path = path.join(__dirname, 'testcase1.json');
const testCase2Path = path.join(__dirname, 'testcase2.json');

const secret1 = processTestCase(testCase1Path);
const secret2 = processTestCase(testCase2Path);

console.log(`\n${'★'.repeat(50)}`);
console.log(`🎯 FINAL ANSWERS:`);
console.log(`   Test Case 1 Secret = ${secret1}`);
console.log(`   Test Case 2 Secret = ${secret2}`);
console.log('★'.repeat(50));
