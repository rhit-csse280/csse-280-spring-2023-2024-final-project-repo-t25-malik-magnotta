var budget = budget || {};
budget.FB_USER_COLLECTION = "UserData";
budget.FB_PURCHASES_COLLECTION = "Purchases";
budget.FB_RECURRING_COLLECTION = "Recurring";
budget.FB_USER_INCOME = "Income";
budget.FB_USER_NAME = "Name";
budget.FB_USER_DATEJOINED = "datejoined";
budget.FB_USER_LASTMONTHSPENDING = "lastMonthExpenses";
budget.FB_USER_SAVED = "saved";
budget.FB_USER_SETASIDE = "setAside";
budget.FB_USER_ID = "userId";
budget.FB_DOP = "dateOfPurchase";
budget.FB_PURCHASE_TYPE = "purchaseType"
budget.FB_COST = "cost";
budget.UID = null;



budget.fbAuthManager = null;
budget.fbUserDataManager = null;
budget.purchasesManager = null;

budget.purchaseValues = ["Groceries", "Resturant", "Personal Care","Transportation","Entertainment","Clothing","Household Supplies","Medical","Gift/Donation"];




function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

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
		}).then((event) => {
			budget.checkForRedirects()});
	}
	async checkIfUserExists(uid){
		let exists = null;
		let query = await this._ref.where(budget.FB_USER_ID, "==", uid).get();
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

	constructor(uid) {
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(budget.FB_PURCHASES_COLLECTION);
		this._unsubscribe = null;
	}

	add(cost,type) {
		this._ref.add({
				[budget.FB_COST]: cost,
				[budget.FB_PURCHASE_TYPE]: type,
				[budget.FB_DOP]: firebase.firestore.Timestamp.now(),
				[budget.FB_USER_ID]: budget.fbAuthManager.uid,
			})
			.then(function (docRef) {
				console.log("Document written with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.error("Error adding document: ", error);
			});
	}

	beginListening(changeListener) {

		let query = this._ref.orderBy(budget.FB_DOP, "desc");
		query = query.where(budget.FB_USER_ID, "==", budget.fbAuthManager.uid);
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
			this._documentSnapshots = querySnapshot.docs;
			changeListener();
		});
	}

	stopListening() {
		this._unsubscribe();
	}
	get length() {
		return this._documentSnapshots.length;
	}

	getpurchaseAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const pur = new budget.Purchase(docSnapshot.id,
			docSnapshot.get(budget.FB_COST),
			docSnapshot.get(budget.FB_PURCHASE_TYPE),
			docSnapshot.get(budget.FB_DOP));
		return pur;
	}
}

budget.PurchaseManager = class {
	constructor(){
		
	}
}

budget.Purchase = class{
	constructor(id, cost, type,dop) {
		this.id = id;
		this.cost = cost;
		this.type = type;
		this.dop = dop;
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

budget.PurchasesPageController = class{

	constructor(){

		document.querySelector("#submitAddPurchase").onclick = (event) => {
			const type = document.querySelector("#formControlSelect").value;
			const cost = document.querySelector("#typeNumber").value;
			budget.purchasesManager.add(cost,type);
		};

		document.querySelector("#purchaseHomeBtn").onclick = (event) => {
			window.location.href = "/home.html";
		};

		budget.purchasesManager.beginListening(this.updateList.bind(this));
	}

	//Change
	updateList() {
		const newList = htmlToElement('<div id="purchasesListContainer"></div>');
		for (let i = 0; i < budget.purchasesManager.length; i++) {
			const pur = budget.purchasesManager.getpurchaseAtIndex(i);
			const newCard = this._createCard(pur);
			newCard.onclick = (event) => {
				console.log("Clicked");
			};
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#purchasesListContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}

	//Change
	_createCard(purchase) {
		return htmlToElement(`<div class="card">
		<div class="card-body">
			<h5 class="card-title">${purchase.cost}</h5>
			<h6 class="card-subtitle mb-2 text-muted">${budget.purchaseValues[purchase.type]}</h6>
		</div>
	</div>`);
	}

}

budget.RecurringPageController = class {
	constructor(){
		document.querySelector("#recurringHomeBtn").onclick = (event) => {
			window.location.href = "/home.html";
		};
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
		new budget.PurchasesPageController();
	}
	else if(document.querySelector("#recurringPage")){
		new budget.RecurringPageController();
	}
}

budget.main = function () {
	console.log("Ready");
	budget.fbAuthManager = new budget.FbAuthManager();
	budget.fbUserDataManager = new budget.UserDataManager();
	budget.purchasesManager = new budget.PurchasesManager();
	budget.fbAuthManager.beginListening(() => {
		budget.checkForRedirects();
		initializePage();
	});

};

budget.main();
