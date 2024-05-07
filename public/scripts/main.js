var budget = budget || {};

budget.UID = null;
budget.fbAuthManager = null;











budget.UserDataManager = class {
	constructor(){
		
	}
}

budget.UserData = class {

	constructor(){

	}
}

budget.PurchasesManager = class {
	constructor(){
		
	}
}

budget.PurchaseManager = class {
	constructor(){
		
	}
}

budget.Purchase = class{
	constructor(){
		
	}
}


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
	if(!!!document.querySelector("#loginPage") && !budget.fbAuthManager.isSignedIn){
		window.location.href = "/";
	}
}

budget.HomePageController = class {
	constructor() {
		document.querySelector("#signOutButton").onclick = (event) => {
			budget.fbAuthManager.signOut();
		}

		document.querySelector("#purchasesPageButton").onclick = (event) => {
			window.location.href = "/purchases.html";
		}

		document.querySelector("#recurringPageButton").onclick = (event) => {
			window.location.href = "/recurring.html";
		}

		document.querySelector("#statsPageButton").onclick = (event) => {
			window.location.href = "/stats.html";
		}
	}
}

budget.StatsPageController = class {
	constructor() {
		this.updateView();

		document.querySelector("#homeButton").onclick = (event) => {
			window.location.href = "/home.html";
		}

	}

	createChart(){
		const ctx = document.getElementById('myChart');
      	new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['January', 'Febuary', 'March', 'April', 'May', 'June','July','August','September','October','November','December'],//this stays constant
          datasets: [{
            label: 'Amount Spent',
            data: [12, 19, 3, 5, 2, 3,5,5,5,5,5,5],
            borderWidth: 3
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
	}

	updateView(){
		this.createChart();
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
	else if(document.querySelector("#recurringPage")){
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
