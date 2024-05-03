var budget = budget || {};

budget.UID = null;
budget.fbAuthManager = null;

budget.FbAuthManager = class {
	constructor() {
		this._user = null;
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			changeListener();
		});
	}
	signUp(email, password) {
		firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error){
			var errorCode = error.code;
			var errorMessage = error.message;
			console.log("Failed to create account", errorCode, errorMessage);
		})
	}
	logIn(email, password){
		firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error){
			var errorCode = error.code;
			var errorMessage = error.message;
			console.log("Failed to create account", errorCode, errorMessage)
		})
	}
	signOut() {
		firebase.auth().signOut();
	}
	get uid() {
		return this._user.uid;
	}
	get isSignedIn() {
		return !!this._user;
	}
}

budget.LoginPageController = class {
	constructor() {
			var uiConfig = {
				signInSuccessUrl: '/home.html',
				signInOptions: [
			  	firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			  	firebase.auth.EmailAuthProvider.PROVIDER_ID,
				],
		  	};
		//   const ui = new firebaseui.auth.AuthUI(firebase.auth());
		//   ui.start('#firebaseui-auth-container', uiConfig);
		  const inputEmailEl = document.querySelector("#inputEmail");
		  const inputPasswordEl = document.querySelector("#inputPassword");
		  document.querySelector("#signUpButton").onclick = (event) => {
			budget.fbAuthManager.signUp(inputEmailEl.value, inputPasswordEl.value);
		  }
		  document.querySelector("#logInButton").onclick = (event) => {
			budget.fbAuthManager.logIn(inputEmailEl.value, inputPasswordEl.value);
		  }
	}
}

budget.checkForRedirects = function(){
	if(document.querySelector("#loginPage") && budget.fbAuthManager.isSignedIn){
		window.location.href = "/home.html";
	}
	if(!document.querySelector("#loginPage") && !budget.fbAuthManager.isSignedIn){
		window.location.href = "/";
	}
}

budget.HomePageController = class {
	constructor() {
		document.querySelector("#signOutButton").onclick = (event) => {
			budget.fbAuthManager.signOut();
		}
	}
}

budget.StatsPageController = class {
	constructor() {
	}
}

initializePage = () => {
	if(document.querySelector("#loginPage")){
		console.log("login Page");
		new budget.LoginPageController();
	}
	else if(document.querySelector("#homePage")){
		console.log("Home Page");
		new budget.HomePageController();
	}
	else if(document.querySelector("#statsPage")){
		console.log("Stats Page");
		new budget.StatsPageController();
	}
	else if(document.querySelector("#purchasesPage")){
		console.log("Purchases Page");

	}
}

budget.main = function () {
	console.log("Ready");
	budget.fbAuthManager = new budget.FbAuthManager();
	budget.fbAuthManager.beginListening(() => {
		budget.checkForRedirects();
		initializePage();
	})
};

budget.main();
