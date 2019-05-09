module.exports = {
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
    moduleFileExtensions: [
        'js',
        'json',
        'jsx',
        'node',
        'ts',
        'tsx',
    ],
    globals: {
        'ts-jest': {
            tsConfig: './tsconfig.json',
        },
    },
    restoreMocks: true,
    testEnvironment: 'node',
    preset: 'ts-jest',
    testMatch: null,
}
