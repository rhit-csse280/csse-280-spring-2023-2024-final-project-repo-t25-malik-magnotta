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
budget.FB_RECURRING_NAME = "name";
budget.FB_START_DATE = "start";
budget.UID = null;

budget.fbAuthManager = null;
budget.fbUserDataManager = null;
budget.purchasesManager = null;
budget.recurringManager = null;

budget.purchasesPageController = null;
budget.recurringPageController = null;
budget.homePageController = null;
budget.statsPageController = null;
budget.userDataController = null;
budget.loginPageController = null;
budget.singleUserManager = null;

budget.purchaseValues = ["Groceries", "Resturant", "Personal Care","Transportation","Entertainment","Clothing","Household Supplies","Medical","Gift/Donation"];
budget.typeColors = ["#3ac568", "#d72828", "#8d41be","#eb7d14","#0bb0f4","#e7184e","#99e817","#ff0100","#16e9ad"];
budget.months = ['January', 'Febuary', 'March', 'April', 'May', 'June','July','August','September','October','November','December'];

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
		}).then((docRef) => {
			const oldDoc = this._ref.doc(docRef.id);
			const newDoc = this._ref.doc(budget.fbAuthManager.uid);
			oldDoc.get().then((doc) => {
				const data = doc.data();
				newDoc.set(data);
				oldDoc.delete().then((event) => {
					budget.checkForRedirects();
				})
			})
			
		})
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

	edit(id,cost,type){
		this._ref.doc(id).update(
			{
				[budget.FB_COST]: cost,
				[budget.FB_PURCHASE_TYPE]: type,
			}
		).then(function (docRef) {
			console.log("Document edited with ID: ", id);
		})
		.catch(function (error) {
			console.error("Error editing document: ", error);
		});
	}

	delete(id){
		this._ref.doc(id).delete();
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

	getTotal(date){
		let total = 0;
		for(let x = 0; x < this._documentSnapshots.length;x++){
			let s = this.getpurchaseAtIndex(x);
			if(s.dop.getUTCMonth() < date.getUTCMonth() || s.dop.getUTCMonth() > date.getUTCMonth())
				continue;
			total = total + parseFloat(s.cost);
		}
		return  total.toFixed(2);
	}
	
	//For graph
	getTotalsFromPastYear(){
		let list = [0,0,0,0,0,0,0,0,0,0,0,0];
		let today = new Date(Date.now());
		//for(let x = ; x > )
		
	}
}

budget.RecurringManager = class {

	constructor(uid) {
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(budget.FB_RECURRING_COLLECTION);
		this._unsubscribe = null;
	}

	add(cost,name) {
		this._ref.add({
				[budget.FB_COST]: cost,
				[budget.FB_RECURRING_NAME]: name,
				[budget.FB_START_DATE]: firebase.firestore.Timestamp.now(),
				[budget.FB_USER_ID]: budget.fbAuthManager.uid,
			})
			.then(function (docRef) {
				console.log("Document written with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.error("Error adding document: ", error);
			});
	}

	edit(id,cost,type){
		this._ref.doc(id).update(
			{
				[budget.FB_COST]: cost,
				[budget.FB_PURCHASE_TYPE]: type,
			}
		).then(function (docRef) {
			console.log("Document edited with ID: ", id);
		})
		.catch(function (error) {
			console.error("Error editing document: ", error);
		});
	}

	delete(id){
		this._ref.doc(id).delete();
	}

	
	beginListening(changeListener) {

		let query = this._ref.orderBy(budget.FB_START_DATE, "desc");
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

	getRecurringAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const rec = new budget.Recurring(docSnapshot.id,
			docSnapshot.get(budget.FB_COST),
			docSnapshot.get(budget.FB_RECURRING_NAME),
			docSnapshot.get(budget.FB_START_DATE));
		return rec;
	}

	getTotal(){
		let total = 0;
		for(let x = 0; x < this._documentSnapshots.length;x++){
			let s = this.getRecurringAtIndex(x);
			total = total + parseFloat(s.cost);
		}
		return total;
	}

}

budget.Purchase = class{
	constructor(id, cost, type,dop) {
		this.id = id;
		this.cost = cost;
		this.type = type;
		this.dop = dop.toDate();
	}
}

budget.Recurring = class{
	constructor(id,cost,name,startDate){
		this.id = id;
		this.cost = cost;
		this.name = name;
		this.start = startDate.toDate();
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
		budget.singleUserManager.beginListening(this.updateView.bind(this));
		
		document.querySelector("#purchasesPageButton").onclick = (event) => {
			window.location.href = "/purchases.html";
		}

		document.querySelector("#recurringPageButton").onclick = (event) => {
			window.location.href = "/recurring.html";
		}

		document.querySelector("#statsPageButton").onclick = (event) => {
			window.location.href = "/stats.html";
		}

		document.querySelector("#menuSignOut").onclick = (event) => {
			budget.fbAuthManager.signOut();
		}

		document.querySelector("#menuUserInfo").onclick = (event) => {
			window.location.href = `/info.html?uid=${budget.fbAuthManager.uid}`;
		}
	}

	updateView(data){
		console.log(data);
		let totalBudget =  data["Income"] - budget.recurringManager.getTotal();
		let precentOfBudget = budget.purchasesManager.getTotal(new Date(Date.now()))/totalBudget;
		let displayPrecent = 100;
		if(precentOfBudget <= 100){
			displayPrecent = precentOfBudget;
		}
		document.querySelector("#coverUp").style.background= `conic-gradient(#00000000 ${(displayPrecent/100)*359.9}deg,white 0deg`;
		document.querySelector("#budgetPrecentage").innerHTML = `${precentOfBudget}%`;
	}

	setUser(doc){
		this.use = doc
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
          labels: budget.months,
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

	lastClicked = null;
	
	constructor(){

		document.querySelector("#submitAddPurchase").onclick = (event) => {
			const type = document.querySelector("#formControlSelect").value;
			const cost = document.querySelector("#typeNumber").value;
			budget.purchasesManager.add(cost,type);
		};

		document.querySelector("#purchaseHomeBtn").onclick = (event) => {
			window.location.href = "/home.html";
		};

		document.getElementById("submitEditPurchase").addEventListener("click",(event)=>{
			const type = document.querySelector("#editFormControlSelect").value;
			const cost = document.querySelector("#editTypeNumber").value;
			budget.purchasesManager.edit(this.lastClicked,cost,type);
		});

		document.getElementById("deletePurchase").addEventListener("click",(event)=>{
			budget.purchasesManager.delete(this.lastClicked);
		});

		budget.purchasesManager.beginListening(this.updateList.bind(this));
	}

	updateList() {
		document.querySelector("#spendingCount").innerHTML = `Total Spent: $${budget.purchasesManager.getTotal(new Date(Date.now()))}`;
		const today = new Date(Date.now());
		const newList = htmlToElement('<div id="purchasesListContainer"></div>');
		for (let i = 0; i < budget.purchasesManager.length; i++) {
			const pur = budget.purchasesManager.getpurchaseAtIndex(i);
			if(pur.dop.getUTCMonth() < today.getUTCMonth() || pur.dop.getUTCMonth() > today.getUTCMonth())
				continue;
			const newCard = this._createCard(pur);
			newCard.onclick = (event) => {
				$('#editPurchaseDialog').modal("show");
				this.lastClicked = pur.id;
			};
			newList.appendChild(newCard);
		}
		const oldList = document.querySelector("#purchasesListContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}


	_createCard(purchase) {
		return htmlToElement(`<div class="card">
		<div class="card-body container">
		  <div class="row">
			<div class="col-10 col-md-7 col-lg-3"><p class="scaleText">${budget.purchaseValues[purchase.type]}</p></div>
			<div class="col-1 col-md-2 col-lg-1" ><div style="border-radius: 50%; height: 25px; width: 25px; background-color: ${budget.typeColors[purchase.type]};"></div></div>
			<div id="costDisplay" class="col-6 col-md-3 col-lg-8"><p class="scaleText">$${purchase.cost}</p></div>
		  </div>
		  <div class="row">
			<div class="col-10"><h8>Date Of Purchase: ${purchase.dop.getUTCMonth() + 1}/${purchase.dop.getUTCDate()}/${purchase.dop.getFullYear()}</h8></div>
			<div class="col-2" style="text-align: center;"><h3 value="${purchase.id}" class="bi bi-pencil-square"></h3></div>
		  </div>
		</div>
	  </div>`);
	}

	get lastClicked(){
		return this.lastClicked;
	}
}

budget.RecurringPageController = class{

	constructor(){

		document.querySelector("#submitAddRecurring").onclick = (event) => {
			const name = document.querySelector("#nameOfRecurringCost").value;
			const cost = document.querySelector("#cost").value;
			budget.recurringManager.add(cost,name);
		};

		document.querySelector("#recurringHomeBtn").onclick = (event) => {
			window.location.href = "/home.html";
		};

		document.getElementById("submitEditRecurring").addEventListener("click",(event)=>{
			const name = document.querySelector("#editNameOfRecurringCost").value;
			const cost = document.querySelector("#editCost").value;
			budget.recurringManager.edit(this.lastClicked,cost,name);
		});

		document.getElementById("deleteRecurring").addEventListener("click",(event)=>{
			budget.recurringManager.delete(this.lastClicked);
		});

		budget.recurringManager.beginListening(this.updateList.bind(this));
	}

	updateList() {
		const newList = htmlToElement('<div id="recurringListContainer"></div>');
		for (let i = 0; i < budget.recurringManager.length; i++) {
			const rec = budget.recurringManager.getRecurringAtIndex(i);
			const newCard = this._createCard(rec);
			newCard.onclick = (event) => {
				$('#editRecurringDialog').modal("show");
				this.lastClicked = rec.id;
			};
			newList.appendChild(newCard);
		}
		const oldList = document.querySelector("#recurringListContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}

	//Edit
	_createCard(recurring) {
		return htmlToElement(`<div class="card">
		<div class="card-body container">
		  <div class="row">
		  <div class="col-10 col-md-9 col-lg-4"><p class="scaleText">${recurring.name}</p></div>
		  <div id="costDisplay" class="col-6 col-md-3 col-lg-8"><p class="scaleText">$${recurring.cost}</p></div>
		  </div>
		  <div class="row">
		  <div class="col-10"><h8>Start Date: ${recurring.start.getUTCMonth() + 1}/${recurring.start.getUTCDate()}/${recurring.start.getFullYear()}</h8></div>
		  <div class="col-2" style="text-align: center;"><h3 value="${recurring.id}" class="bi bi-pencil-square"></h3></div>
		  </div>
		</div>
		</div>`);
	}
}


budget.SingleUserManager = class {
	constructor(){
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(budget.FB_USER_COLLECTION).doc(budget.fbAuthManager.uid);
	}

	beginListening(changeListener){
		this._ref.onSnapshot((doc) => {
				console.log(doc.data());
				this._documentSnapshot = doc;
				changeListener(doc);
		})
	}

	stopListening(){
		this._unsubscribe();
	}

	get name(){
		return this._documentSnapshot.get(budget.FB_USER_NAME);
	}

	get income(){
		return this._documentSnapshot.get(budget.FB_USER_INCOME);
	}

	get setAsidePerMonth(){
		return this._documentSnapshot.get(budget.FB_USER_SETASIDE);
	}

	get lastMonthExpenses(){
		return this._documentSnapshot.get(budget.FB_USER_LASTMONTHSPENDING);
	}

	get savings(){
		return this._documentSnapshot.get(budget.FB_USER_SAVED);
	}

	get dateJoined(){
		const dateString =  this._documentSnapshot.get(budget.FB_USER_DATEJOINED).toDate().toString();
		let firstSpaceIndex = 0;
		let lastSpaceIndex = 0;
		let numSpaces = 0;
		for(let i = 0; i < dateString.length; i++){
			if(dateString[i] == ' '){
				numSpaces++;
				if(numSpaces == 1){
					firstSpaceIndex = i;
				}
				if(numSpaces == 4){
					lastSpaceIndex = i;
				}
			}
		}
		return dateString.substring(firstSpaceIndex+1, lastSpaceIndex);
	}
}

budget.InfoPageController = class {
	constructor(){
		budget.singleUserManager.beginListening(this.updateView.bind(this));
		document.querySelector("#home").onclick = (event) => {
			window.location.href = "/home.html";
		}
	}

	updateView(){
		console.log("updating view");
		document.querySelector("#statName").innerHTML = `Name: ${budget.singleUserManager.name}`;
		document.querySelector("#statIncome").innerHTML = `Income: $${budget.singleUserManager.income}`;
		document.querySelector("#statSetAside").innerHTML = `Set Aside Per Month: $${budget.singleUserManager.setAsidePerMonth}`;
		document.querySelector("#statLastMonthExpenses").innerHTML = `Last Month's Expenses: $${budget.singleUserManager.lastMonthExpenses}`;
		document.querySelector("#statSaved").innerHTML = `Amount Saved: $${budget.singleUserManager.savings}`;
		document.querySelector("#statDateJoined").innerHTML = `Date Joined: ${budget.singleUserManager.dateJoined}`;
	}
}


initializePage = () => {
	if(document.querySelector("#loginPage")){
		console.log("login Page");
		budget.loginPageController =  new budget.LoginPageController();
	}
	else if(document.querySelector("#homePage")){
		console.log("Home Page");
		budget.singleUserManager = new budget.SingleUserManager();
		budget.homePageController = new budget.HomePageController();
	}
	else if(document.querySelector("#statsPage")){
		console.log("Stats Page");
		budget.statsPageController = new budget.StatsPageController();
	}
	else if(document.querySelector("#entryPage")){
		console.log("Entry Page");
		budget.userDataController = new budget.UserDataController();
	}
	else if(document.querySelector("#purchasesPage")){
		budget.purchasesPageController = new budget.PurchasesPageController();
	}
	else if(document.querySelector("#recurringPage")){
		budget.recurringPageController = new budget.RecurringPageController();

	}
	else if(document.querySelector("#infoPage")){
		budget.singleUserManager = new budget.SingleUserManager();
		new budget.InfoPageController();
	}
	else if(document.querySelector("#infoPage")){
		budget.singleUserManager = new budget.SingleUserManager();
		new budget.InfoPageController();
	}
}

budget.main = function () {
	console.log("Ready");
	budget.fbAuthManager = new budget.FbAuthManager();
	budget.fbUserDataManager = new budget.UserDataManager();
	budget.purchasesManager = new budget.PurchasesManager();
	budget.recurringManager = new budget.RecurringManager();
	budget.fbAuthManager.beginListening(() => {
		budget.checkForRedirects();
		initializePage();
	});

};

budget.main();
