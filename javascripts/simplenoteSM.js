
function SimplenoteSM() {
    
}

SimplenoteSM.prototype = {

    get email() {
        return localStorage.option_email;
    },

    get password() {
        return localStorage.option_password;
    },

    get credentialsValid() {
        return localStorage.credentialsValid == "true";
    },

    set credentialsValid(b) {
        localStorage.credentialsValid = b == true;
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
        var credentials = { email: this.email, password: this.password };
        
        if (localStorage.token) {
            credentials.token = localStorage.token;
            credentials.tokenTime = new Date(localStorage.tokenTime);
        }
        return credentials;
    }
}

