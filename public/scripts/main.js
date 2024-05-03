var budget = budget || {};

budget.UID = null;


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
	signIn() {
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
		  const ui = new firebaseui.auth.AuthUI(firebase.auth());
		  ui.start('#firebaseui-auth-container', uiConfig);
	}
}

budget.HomePageController = class {
	constructor() {
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
	initializePage();
};

budget.main();
