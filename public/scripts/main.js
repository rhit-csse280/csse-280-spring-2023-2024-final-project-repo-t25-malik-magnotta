var budget = budget || {};
budget.FB_USER_COLLECTION = "UserData";
budget.FB_USER_INCOME = "Income";
budget.FB_USER_NAME = "Name";
budget.FB_USER_DATEJOINED = "datejoined";
budget.FB_USER_LASTMONTHSPENDING = "lastMonthExpenses";
budget.FB_USER_SAVED = "saved";
budget.FB_USER_SETASIDE = "setAside";
budget.FB_USER_ID = "userId";
budget.UID = null;
budget.fbAuthManager = null;
budget.fbUserDataManager = null;










budget.UserDataManager = class {
	constructor(){
		this._ref = firebase.firestore().collection(budget.FB_USER_COLLECTION);
	}
	add(income, name){
		this._ref.add({
			[budget.FB_USER_INCOME]: income,
			[budget.FB_USER_NAME]: name,
			[budget.FB_USER_DATEJOINED]: firebase.firestore.Timestamp.now(),
			[budget.FB_USER_LASTMONTHSPENDING]: 0,
			[budget.FB_USER_SAVED]: 0,
			[budget.FB_USER_SETASIDE]: 0,
			[budget.FB_USER_ID]: budget.fbAuthManager.uid
		}).then(budget.checkForRedirects());
	}
	async checkIfUserExists(uid){
		let exists = null;
		let query = await this._ref.where(budget.FB_USER_ID, "==", uid).get();
		console.log(query);	
		console.log(uid);
		return !query.empty;
		
	}
}

budget.UserDataController = class {

	constructor(){
		this.name = document.querySelector("#inputName");
		this.income = document.querySelector("#inputIncome");

		document.querySelector("#enterButton").onclick = (event) => {
			budget.fbUserDataManager.add(this.income.value, this.name.value);
		}

		document.querySelector("#cancelButton").onclick = (event) => {
			budget.fbAuthManager.signOut();
		}
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

budget.checkForRedirects = async function(){
	if(document.querySelector("#loginPage") && budget.fbAuthManager.isSignedIn){
			
		if(!(await budget.fbUserDataManager.checkIfUserExists(budget.fbAuthManager.uid))){
			window.location.href = "/entry.html";
		} else{
			window.location.href = `/home.html?uid=${budget.fbAuthManager.uid}`;
		}
	}
	if(!!!document.querySelector("#loginPage") && !budget.fbAuthManager.isSignedIn){
		window.location.href = "/";
	}
	if(document.querySelector("#entryPage") && await budget.fbUserDataManager.checkIfUserExists(budget.fbAuthManager.uid)){
		window.location.href = `/home.html?uid=${budget.fbAuthManager.uid}`;
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
	else if(document.querySelector("#entryPage")){
		console.log("Entry Page");
		new budget.UserDataController();
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
	budget.fbUserDataManager = new budget.UserDataManager();
	budget.fbAuthManager.beginListening(() => {
		budget.checkForRedirects();
		initializePage();
	})
};

budget.main();
