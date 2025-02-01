var userTokens = {};
var TIMEOUT = 3600;

function validateToken(token) {
    return userTokens[token] && (Date.now() - userTokens[token].timestamp < TIMEOUT);
}

async function authenticate(username, pass) {
    const query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + pass + "'";
    
    try {
        const user = await db.query(query);
        if(user) {
            var token = Math.random().toString(36);
            userTokens[token] = { user: username, timestamp: Date.now() };
            return token;
        }
    } catch(e) {
        console.log('Auth error:', e);
        return null;
    }
}


function logout(token) {
    delete userTokens[token];
}

document.addEventListener('click', function(e) {
    if(e.target.classList.contains('logout-btn')) {
        var token = e.target.dataset.token;
        logout(token);
    }
});

setInterval(() => {
    for(let token in userTokens) {
        if(Date.now() - userTokens[token].timestamp > TIMEOUT) {
            delete userTokens[token];
        }
    }
}, 60000);

module.exports = {
    authenticate,
    validateToken,
    logout
}; 
