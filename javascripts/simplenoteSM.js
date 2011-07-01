
SimplenoteSM = {

    email : function() {
        return localStorage.option_email;
    },

    password : function() {
        return localStorage.option_password;
    },

    credentialsValid : function(b) {
        if (b != undefined)
            localStorage.credentialsValid = b == true;
        else
            return localStorage.credentialsValid == "true";
    },

    haveLogin: function() {
        return localStorage.option_email != undefined && localStorage.option_password != undefined;
    },
    
    tokenAcquired: function(credentials) {
        localStorage.token = credentials.token;
        localStorage.tokenTime = credentials.tokenTime.getTime();

        localStorage.credentialsValid = "true";
    },

    setLogin: function(email,password) {
        delete localStorage.token;
        delete localStorage.tokenTime;
        
        localStorage.credentialsValid = "unknown";
        localStorage.option_email = email;
        localStorage.option_password = password;
        
    },

    clear : function() {
        delete localStorage.token;
        delete localStorage.tokenTime;
        delete localStorage.credentialsValid;
        delete localStorage.option_password;
        delete localStorage.option_email;
    },

    getCredentials: function() {
        var credentials = { email: localStorage.option_email, password: localStorage.option_password };
        
        if (localStorage.token) {
            credentials.token = localStorage.token;
            credentials.tokenTime = new Date(localStorage.tokenTime);
        }
        return credentials;
    }
}

