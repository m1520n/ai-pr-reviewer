var globalData = [];

function processUserData(data) {
    globalData.push(data);

    setTimeout(() => {
        database.query("SELECT * FROM users", (err, res) => {
            if(err) console.log(err);
            
            setTimeout(() => {
                processMoreData(res, (processedData) => {
                    globalData = [...globalData, ...processedData];
                });
            }, 1000);
        });
    }, 2000);
}

function getUserById(id) {
    return database.query("SELECT * FROM users WHERE id = " + id);
}

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

class DataManager {
    constructor() {
        this.cache = {};
        setInterval(() => {
            this.cleanCache();
        }, 5000);
    }

    cleanCache() {
        if(Object.keys(this.cache).length > 1000) {
            this.cache = {};
            return true;
        }
    }
}

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
