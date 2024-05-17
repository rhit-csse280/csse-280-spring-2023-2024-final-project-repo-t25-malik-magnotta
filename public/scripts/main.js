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
budget.typeColors = ["#3ac568", "#eddd4a", "#8d41be","#eb7d14","#0bb0f4","#f781f3","#99e817","#ff0100","#16e9ad"];
budget.months = ['January', 'Febuary', 'March', 'April', 'May', 'June','July','August','September','October','November','December'];

function getMonths() {
	let date = new Date(Date.now());
	let list = [];
	for(let x = 0; x < 12; x++){
		let month = mod(date.getUTCMonth()-x,12);
		list[11-x]=budget.months[month];
	}
	return list;
}

function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

function mod(n, m) {
	return ((n % m) + m) % m;
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


	getTotalOfType(type){
		let total = 0;
		const date = new Date(Date.now());
		for(let x = 0; x < this._documentSnapshots.length;x++){
			let s = this.getpurchaseAtIndex(x);
			if(s.dop.getUTCMonth() < date.getUTCMonth() || s.dop.getUTCMonth() > date.getUTCMonth())
				break;
			if(type != s.type)
				continue;
			total = total + parseFloat(s.cost);
		}
		return  total.toFixed(2);
	}
	
	//For graph
	getTotalsFromPastYear(){
		let list = [];
		let today = new Date(Date.now());
		
		for(let x = 0; x < 12;x++){
			 let i = (today.getUTCMonth()-x);
			 let year = parseInt(today.getFullYear());
			 if(i < 0){
				year = year-1;
				i = mod(i,12);
			 }
			 let date = new Date(`${i+1}-01-${year}`);
			 list[11-x] = this.getTotal(date);
		}
		return list;
	}

	getPrecentOfEachType(){
		let list = [];
		for(let x = 0; x < budget.purchaseValues.length;x++){
			list.push(this.getTotalOfType(x));
		}
		return list;
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

	edit(id,cost,name){
		this._ref.doc(id).update(
			{
				[budget.FB_COST]: cost,
				[budget.FB_RECURRING_NAME]: name,
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
		budget.purchasesManager.beginListening(()=>{});
		budget.recurringManager.beginListening(()=>{});
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

	async updateView(){
		const income = parseFloat(budget.singleUserManager.income);
		const recurringCosts = parseFloat(budget.recurringManager.getTotal());
		const totalBudget =  income - recurringCosts - budget.singleUserManager.setAsidePerMonth;
		document.querySelector("#totalBudget").innerHTML = `Total Budget: $${totalBudget}`;
		document.querySelector('#budgetUsed').innerHTML = `Used: $${budget.purchasesManager.getTotal(new Date(Date.now()))}`
		let precentOfBudget = parseFloat((Math.round( parseFloat((budget.purchasesManager.getTotal(new Date(Date.now())))/totalBudget) * 100) / 100).toFixed(2));
		let displayPrecent = (precentOfBudget*100).toFixed(0);
		if(displayPrecent >= 100){
			if(displayPrecent == 100){
				document.querySelector("#budgetPrecentage").innerHTML = `100%`;
			}
			else{
				document.querySelector("#budgetPrecentage").innerHTML = `&nbsp;&nbsp;Over Budget`;
			}
			document.querySelector("#coverUp").style.background= `red`;
		}
		else{
			document.querySelector("#coverUp").style.background= `conic-gradient(#00000000 ${(precentOfBudget)*359.9}deg,white 0deg`;
			document.querySelector("#budgetPrecentage").innerHTML = `${displayPrecent}%`;
		}	
	}

}

budget.StatsPageController = class {
	constructor() {
		
		document.querySelector("#homeButton").onclick = (event) => {
			window.location.href = "/home.html";
		}
		budget.purchasesManager.beginListening(this.createChart.bind(this));
	}

	createChart(){
		const ctx = document.getElementById('myChart');
      	new Chart(ctx, {
        type: 'bar',
        data: {
          labels: getMonths(),
          datasets: [{
            label: 'Amount Spent',
            data: budget.purchasesManager.getTotalsFromPastYear(),
            borderWidth: 3
          }]
        },
        options: {
			indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true
            },
			
          },
		  plugins: {
			title: {
			  display: true,
			  text: 'Amount Spent Each month Over past Year',
			  font: {
				size:25,
				family: 'Arial',
			  }
			}
		  },
		  responsive: true,
		  mantainAspectRatio:false,
		  aspectRatio: 12/14
        }
      });



	  const data = {
		labels: budget.purchaseValues,
		datasets: [
		  {
			label: 'Amount in $',
			data: budget.purchasesManager.getPrecentOfEachType(),
			backgroundColor: budget.typeColors,
		  }
		]
	  };
	  const don = document.getElementById('myDougnutChart');
	  const config = {
		type: 'doughnut',
		data: data,
		options: {
		  responsive: true,
		  plugins: {
			legend: {
			  position: 'top',
			},
			title: {
			  display: true,
			  text: 'Spending on Different Items This Month',
			  font: {
				size:30,
				family: 'Arial',
			  }
			}
		  }
		},
	  };
	  new Chart(don,config);

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

		budget.singleUserManager.beginListening(() =>{});
		budget.recurringManager.beginListening(this.updateList.bind(this));
	}

	updateList() {
		document.querySelector("#budgetTotalDisplay").innerHTML =  `Budget after Recurring Costs: $${budget.singleUserManager.income - budget.recurringManager.getTotal() - budget.singleUserManager.setAsidePerMonth}`;

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
				this._documentSnapshot = doc;
				changeListener();
		})
	}

	stopListening(){
		this._unsubscribe();
	}

	update(income, setAsidePerMonth, lastMonthExpenses, savings){
		this._ref.update({
			[budget.FB_USER_INCOME]: income,
			[budget.FB_USER_SETASIDE]: setAsidePerMonth,
			[budget.FB_USER_LASTMONTHSPENDING]: lastMonthExpenses,
			[budget.FB_USER_SAVED]: savings
		})
		.then(() => {
			console.log("Successfully updated user");
		}).catch((error) => {
			console.log("Update failed! Error ", error);
		})
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
		document.querySelector("#submitUpdateUser").addEventListener("click", (event) => {
			const income = document.querySelector("#inputIncome").value;
			const setAsidePerMonth = document.querySelector("#inputSetAsidePerMonth").value;
			const lastMonthExpenses = document.querySelector("#inputLastMonthExpenses").value;
			const saved = document.querySelector("#inputSaved").value;
			budget.singleUserManager.update(income, setAsidePerMonth, lastMonthExpenses, saved);
		})
		$("#editDataDialog").on("show.bs.modal", (event) => {
			document.querySelector("#inputIncome").value = budget.singleUserManager.income;
			document.querySelector("#inputSetAsidePerMonth").value = budget.singleUserManager.setAsidePerMonth;
			document.querySelector("#inputLastMonthExpenses").value = budget.singleUserManager.lastMonthExpenses;
			document.querySelector("#inputSaved").value = budget.singleUserManager.savings;
		})
		$("#editDataDialog").on("shown.bs.modal", (event) => {
			document.querySelector("#inputIncome").focus();
		})
		budget.singleUserManager.beginListening(this.updateView.bind(this));
		document.querySelector("#home").onclick = (event) => {
			window.location.href = "/home.html";
		}
	}

	updateView(){
		console.log("updating view");
		document.querySelector("#statName").innerText = `Name: ${budget.singleUserManager.name}`;
		document.querySelector("#statIncome").innerText = `Income: $${budget.singleUserManager.income}`;
		document.querySelector("#statSetAside").innerText = `Set Aside Per Month: $${budget.singleUserManager.setAsidePerMonth}`;
		document.querySelector("#statLastMonthExpenses").innerText = `Last Month's Expenses: $${budget.singleUserManager.lastMonthExpenses}`;
		document.querySelector("#statSaved").innerText = `Amount Saved: $${budget.singleUserManager.savings}`;
		document.querySelector("#statDateJoined").innerText = `Date Joined: ${budget.singleUserManager.dateJoined}`;
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
		budget.singleUserManager = new budget.SingleUserManager();
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
