
module.exports =  {
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
    globals:{
        'ts-jest':{
            // 有ts错误 测试就执行失败
            //    enableTsDiagnostics:true
            "tsConfigFile": "./tsconfig.json"
        }
    },
    restoreMocks:true,
    "testEnvironment": "node"
};