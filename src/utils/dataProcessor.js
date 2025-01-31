// Global variable - bad practice
var globalData = [];

// Function with multiple responsibilities and poor error handling
function processUserData(data) {
    // Direct array mutation
    globalData.push(data);

    // Nested callbacks - callback hell
    setTimeout(() => {
        database.query("SELECT * FROM users", (err, res) => {
            if(err) console.log(err);  // Poor error handling
            
            setTimeout(() => {
                processMoreData(res, (processedData) => {
                    globalData = [...globalData, ...processedData];
                });
            }, 1000);
        });
    }, 2000);
}

// Security vulnerability - SQL injection risk
function getUserById(id) {
    return database.query("SELECT * FROM users WHERE id = " + id);
}

// Performance issue - O(n^2) complexity
function findDuplicateUsers(users) {
    let duplicates = [];
    for(let i = 0; i < users.length; i++) {
        for(let j = 0; j < users.length; j++) {
            if(i !== j && users[i].email === users[j].email) {
                duplicates.push(users[i]);
            }
        }
    }
    return duplicates;
}

// Memory leak potential
class DataManager {
    constructor() {
        this.cache = {};
        setInterval(() => {
            this.cleanCache();
        }, 5000);  // Interval never cleared
    }

    // Inconsistent return types
    cleanCache() {
        if(Object.keys(this.cache).length > 1000) {
            this.cache = {};
            return true;
        }
    }
}

// Magic numbers and poor variable naming
function calc(a, b) {
    if(a > 1000) {
        return a * 1.5 + b * 0.8;
    }
    return a + b * 0.8;
}

module.exports = {
    processUserData,
    getUserById,
    findDuplicateUsers,
    DataManager,
    calc
};