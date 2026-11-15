# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
A new major version is released whenever a change affects the hashing/indexing system or breaks the API: in that case, filters and sketches **must be rebuilt from scratch**.

## [Unreleased] - 4.0.0

### Fixed

- **BREAKING:** `HyperLogLog#count()` returned about half of the true cardinality for small sets (estimate below `5m/2`) and overestimated just above that threshold. Registers now store the 1-based rank of the leftmost 1-bit, as in the original algorithm. Register values change, so sketches exported with a previous version must be rebuilt ([#131](https://github.com/Callidon/bloom-filters/issues/131)).

### Changed

- **BREAKING:** hashing now relies only on `@node-rs/xxhash` with `bigint` values ([#90](https://github.com/Callidon/bloom-filters/pull/90)).
- **BREAKING:** removed the usages of `Buffer` and of the `long` package, and reworked the ESM/CJS imports ([#86](https://github.com/Callidon/bloom-filters/pull/86)).
- Major dependency upgrades ([#76](https://github.com/Callidon/bloom-filters/pull/76), [#89](https://github.com/Callidon/bloom-filters/pull/89)).
- Tests now run with Jest instead of Mocha ([#88](https://github.com/Callidon/bloom-filters/pull/88)).

### Removed

- **BREAKING:** the auto exportable mechanism ([#87](https://github.com/Callidon/bloom-filters/pull/87)).

## [3.0.4] - 2024-11-21

### Fixed

- Removed the deprecated lodash per-method packages to fix vulnerabilities ([#80](https://github.com/Callidon/bloom-filters/pull/80)).

## [3.0.3] - 2024-11-13

### Fixed

- Added `@types/seedrandom` to the dependencies ([#77](https://github.com/Callidon/bloom-filters/pull/77)).

## [3.0.2] - 2024-06-11

### Fixed

- HyperLogLog and seedrandom typings ([#73](https://github.com/Callidon/bloom-filters/pull/73)).

## [3.0.1] - 2023-10-03

### Fixed

- Bad seed import in the Cuckoo filter ([#65](https://github.com/Callidon/bloom-filters/pull/65)).

## [3.0.0] - 2022-03-30

### Added

- Scalable Bloom filters ([#53](https://github.com/Callidon/bloom-filters/pull/53)).

### Changed

- Use an array of BitSet for the Partitioned Bloom Filter.

### Fixed

- Wrong MinHash comparison.

## [2.0.0] - 2022-02-18

### Added

- XorFilter ([#29](https://github.com/Callidon/bloom-filters/issues/29)).
- `.nextInt32()` function to get a new random seeded 32-bits integer from the current seed.

### Changed

- Use double hashing correctly ([#43](https://github.com/Callidon/bloom-filters/issues/43)).
- Moved all hashing related functions to a specific Hash class, used as a component of the BaseFilter class. It also allows overriding the serialize function to use custom hash functions.
- Optimized the BloomFilter internal storage with Uint arrays ([#44](https://github.com/Callidon/bloom-filters/pull/44)).
- All properties are now public, to allow developers to override everything.
- Disabled the Node.js 10.x and 15.x tests.

## [1.3.0] - 2020-04-10

### Added

- MinHash set.

## [1.2.0] - 2020-04-08

### Added

- TopK class.

## [1.1.0] - 2020-04-03

### Added

- HyperLogLog sketch.

## [1.0.0] - 2020-03-23

### Changed

- Reworked the whole library using TypeScript, unified the API and fixed the documentation.

## [0.8.0] - 2019-11-11

### Changed

- Reworked the global API, which now allows customizing each filter. Use the `.create()` or `.from()` functions to match the old API.

### Fixed

- Performance issues with the Cuckoo filter.

## [0.7.1] - 2019-09-11

### Added

- Counting Bloom Filter.

## [0.7.0] - 2019-07-01

### Added

- `_seed` property in the exported JSON, used to seed every hash of every element.
- `#add`, `#has`, `#delete`, `#listEntries`, `#substract` and `#Static.decode` methods for Invertible Bloom Filters.

### Changed

- Moved to [XXHASH](https://cyan4973.github.io/xxHash/) for hashing elements.
- Updated the way distinct indices are computed, which could have collisions in many cases.

## [0.6.1] - 2019-06-18

### Added

- Invertible Bloom Filters (only the `#encode`, `#substract` and `#Static.decode` methods).

[Unreleased]: https://github.com/Callidon/bloom-filters/compare/v3.0.4...HEAD
[3.0.4]: https://github.com/Callidon/bloom-filters/compare/v3.0.3...v3.0.4
[3.0.3]: https://github.com/Callidon/bloom-filters/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/Callidon/bloom-filters/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/Callidon/bloom-filters/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/Callidon/bloom-filters/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/Callidon/bloom-filters/releases/tag/v2.0.0
