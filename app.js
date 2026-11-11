
(function () {
    // ---------- LocalStorage helpers ----------
    function readArray(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function writeArray(key, arr) {
        localStorage.setItem(key, JSON.stringify(arr));
    }

    function getUserName() {
        const v = localStorage.getItem("user");
        return v ? v.trim() : "";
    }

    function setUserName(name) {
        localStorage.setItem("user", name);
    }

    function getUserEmail() {
        const v = localStorage.getItem("email");
        return v ? v.trim() : "";
    }

    function getUserPassword() {
        const v = localStorage.getItem("password");
        return v ? v.trim() : "";
    }

    function validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    function getBalance() {
        const v = localStorage.getItem("creditBalance");
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function setBalance(n) {
        localStorage.setItem("creditBalance", String(Number(n)));
    }

    function moneyILS(n) {
        const num = Number(n);
        const ok = Number.isFinite(num) ? num : 0;
        return "₪" + ok.toFixed(2);
    }

    function todayDDMMYYYY() {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = String(d.getFullYear());
        return dd + "/" + mm + "/" + yyyy;
    }

    // Parse dd/mm/yyyy -> Date for sorting
    function parseDDMMYYYY(s) {
        if (!s || typeof s !== "string") return new Date(0);
        const parts = s.split("/");
        if (parts.length !== 3) return new Date(0);
        const dd = Number(parts[0]);
        const mm = Number(parts[1]);
        const yyyy = Number(parts[2]);
        if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return new Date(0);
        return new Date(yyyy, mm - 1, dd);
    }

    function showMsg(id, text, ok) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.className = "msg " + (ok ? "ok" : "err");
        el.style.display = "block";
    }

    function hideMsg(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = "none";
    }

    // ---------- Screen routing (single page) ----------
    const screens = [
        "register",
        "login",
        "dashboard",
        "categories",
        "items",
        "orders",
        "credit",
        "admin",
    ];

    function setActiveNav(navId) {
        const ids = ["navHome", "navCats", "navAdmin", "navCredit"];
        for (let i = 0; i < ids.length; i++) {
            const b = document.getElementById(ids[i]);
            if (b) b.classList.remove("active");
        }
        const a = document.getElementById(navId);
        if (a) a.classList.add("active");
    }

    function showScreen(name) {
        for (let i = 0; i < screens.length; i++) {
            const sec = document.getElementById("screen-" + screens[i]);
            if (sec) sec.classList.remove("active");
        }
        const target = document.getElementById("screen-" + name);
        if (target) target.classList.add("active");


        // hide header/footer on login/register
        document.body.classList.toggle("loginMode", name === "login" || name === "register");

        // update nav highlight
        if (name === "dashboard") setActiveNav("navHome");
        else if (name === "categories" || name === "items") setActiveNav("navCats");
        else if (name === "admin") setActiveNav("navAdmin");
        else if (name === "credit") setActiveNav("navCredit");
        else if (name === "orders") setActiveNav(null);
        else setActiveNav(null);

        // refresh per screen
        if (name === "dashboard") renderDashboard();
        if (name === "categories") renderCategories();
        if (name === "items") renderItems();
        if (name === "orders") renderOrders();
        if (name === "credit") renderCredit();
    }

    function requireLoginOrGoLogin() {
        if (getUserName() === "") {
            // Check if user data exists in localStorage
            const storedUser = localStorage.getItem("user");
            const storedEmail = localStorage.getItem("email");
            const storedPassword = localStorage.getItem("password");
            
            if (!storedUser || !storedEmail || !storedPassword) {
                showScreen("register");
            } else {
                showScreen("login");
            }
            return false;
        }
        return true;
    }

    // ---------- Top menu ----------
    function setupTopMenu() {
        const btn = document.getElementById("menuBtn");
        const panel = document.getElementById("menuPanel");
        if (!btn || !panel) return;

        btn.addEventListener("click", function () {
            panel.style.display = panel.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", function (e) {
            if (e.target === btn) return;
            if (panel.contains(e.target)) return;
            panel.style.display = "none";
        });

        const links = panel.querySelectorAll(".menuLink");
        for (let i = 0; i < links.length; i++) {
            links[i].addEventListener("click", function () {
                panel.style.display = "none";
                const s = links[i].getAttribute("data-screen");
                if (!s) return;
                if (s !== "login" && !requireLoginOrGoLogin()) return;
                showScreen(s);
            });
        }
    }

    // ---------- Footer navigation ----------
    function setupBottomNav() {
        const navButtons = document.querySelectorAll(".navItem");
        for (let i = 0; i < navButtons.length; i++) {
            navButtons[i].addEventListener("click", function () {
                const s = navButtons[i].getAttribute("data-screen");
                if (!s) return;
                if (!requireLoginOrGoLogin()) return;
                showScreen(s);
            });
        }
    }

    // ---------- Dashboard ----------
    function dailyGreeting() {
        const h = new Date().getHours();
        if (h < 12) return "בוקר טוב!";
        if (h < 18) return "צהריים טובים!";
        return "ערב טוב!";
    }

    function renderHistogram() {
        const orders = readArray("orders");
        const bars = document.getElementById("histBars");
        const hint = document.getElementById("histHint");
        if (!bars || !hint) return;

        // clear
        while (bars.firstChild) bars.removeChild(bars.firstChild);

        if (orders.length === 0) {
            hint.textContent = "";
            return;
        }

        // count by שםפריט
        const counts = {};
        for (let i = 0; i < orders.length; i++) {
            const pn = String(orders[i].שםפריט || "").trim();
            if (pn === "") continue;
            if (!counts[pn]) counts[pn] = 0;
            counts[pn] += 1;
        }

        const entries = Object.keys(counts).map(function (k) {
            return { name: k, count: counts[k] };
        });

        // sort desc by count
        entries.sort(function (a, b) { return b.count - a.count; });

        // show up to 10 bars
        const maxBars = entries.slice(0, 10);
        let maxCount = 1;
        for (let i = 0; i < maxBars.length; i++) {
            if (maxBars[i].count > maxCount) maxCount = maxBars[i].count;
        }

        for (let i = 0; i < maxBars.length; i++) {
            const wrap = document.createElement("div");
            wrap.className = "barWrap";

            const bar = document.createElement("div");
            bar.className = "bar";
            // height in % of 200px-ish area
            const h = Math.round((maxBars[i].count / maxCount) * 180) + 10;
            bar.style.height = h + "px";

            const val = document.createElement("div");
            val.className = "barValue";
            val.textContent = String(maxBars[i].count);

            const label = document.createElement("div");
            label.className = "barLabel";
            label.textContent = maxBars[i].name.length > 8 ? maxBars[i].name.slice(0, 8) + "…" : maxBars[i].name;

            bar.appendChild(val);
            wrap.appendChild(bar);
            wrap.appendChild(label);
            bars.appendChild(wrap);
        }

        hint.textContent = "מוצגים עד 10 מוצרים מובילים.";
    }

    function renderLastOrder() {
        const box = document.getElementById("lastOrderBox");
        if (!box) return;
        const orders = readArray("orders");
        if (orders.length === 0) {
            box.textContent = "אין הזמנה אחרונה להצגה.";
            return;
        }
        // find newest by date
        let best = orders[0];
        let bestD = parseDDMMYYYY(orders[0].תאריך);
        for (let i = 1; i < orders.length; i++) {
            const d = parseDDMMYYYY(orders[i].תאריך);
            if (d.getTime() > bestD.getTime()) {
                best = orders[i];
                bestD = d;
            }
        }
        box.textContent = "הזמנה אחרונה: " + String(best.שםפריט || "") + " (" + String(best.תאריך || "") + ") - " + moneyILS(Number(best.סכום));
    }

    function renderDashboard() {
        if (!requireLoginOrGoLogin()) return;

        const hello = document.getElementById("helloText");
        const clock = document.getElementById("clockText");
        const daily = document.getElementById("dailyGreet");
        const bal = document.getElementById("dashBalance");

        if (hello) hello.textContent = "שלום, " + getUserName() + "!";
        if (daily) daily.textContent = dailyGreeting();

        if (bal) bal.textContent = moneyILS(getBalance());

        // clock updates
        if (clock) {
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, "0");
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const yyyy = String(now.getFullYear());
            const hh = String(now.getHours()).padStart(2, "0");
            const mi = String(now.getMinutes()).padStart(2, "0");
            clock.textContent = dd + "/" + mm + "/" + yyyy + "  " + hh + ":" + mi;
        }

        renderHistogram();
        renderLastOrder();
    }

    // ---------- Categories & Items ----------
    const categories = [
        { id: 1, name: "משקאות", emoji: "☕" },
        { id: 2, name: "מאפים", emoji: "🥐" },
        { id: 3, name: "סלטים", emoji: "🥗" },
        { id: 4, name: "כריכים", emoji: "🥪" },
        { id: 5, name: "טוסטים", emoji: "🧀" },
        { id: 6, name: "ארוחות בוקר", emoji: "🍳" },
    ];

    let currentCategoryId = 1;

    function renderCategories() {
        if (!requireLoginOrGoLogin()) return;
        hideMsg("msgCats");

        const grid = document.getElementById("catsGrid");
        if (!grid) return;

        while (grid.firstChild) grid.removeChild(grid.firstChild);

        for (let i = 0; i < categories.length; i++) {
            const c = categories[i];

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "card clickable";
            btn.setAttribute("aria-label", c.name);

            const title = document.createElement("div");
            title.className = "cardTitle";
            title.textContent = c.emoji + " " + c.name;

            btn.appendChild(title);

            btn.addEventListener("click", function () {
                currentCategoryId = c.id;
                showScreen("items");
            });

            grid.appendChild(btn);
        }
    }

    function renderItems() {
        if (!requireLoginOrGoLogin()) return;
        hideMsg("msgItems");

        const title = document.getElementById("itemsTitle");
        const list = document.getElementById("itemsList");
        if (!title || !list) return;

        // clear
        while (list.firstChild) list.removeChild(list.firstChild);

        // title
        let catName = "";
        for (let i = 0; i < categories.length; i++) {
            if (categories[i].id === currentCategoryId) catName = categories[i].name;
        }
        title.textContent = "פריטים - " + catName;

        const items = readArray("items").filter(function (it) {
            return Number(it.קטגוריה) === Number(currentCategoryId);
        });

        if (items.length === 0) {
            const empty = document.createElement("div");
            empty.className = "muted";
            empty.textContent = "";
            list.appendChild(empty);
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const it = items[i];

            const card = document.createElement("div");
            card.className = "card";

            const row = document.createElement("div");
            row.className = "row";

            const left = document.createElement("div");
            const name = document.createElement("div");
            name.className = "cardTitle";
            name.textContent = String(it.שםפריט || "");

            const price = document.createElement("div");
            price.className = "muted mt10";
            price.textContent = "מחיר: " + moneyILS(Number(it.מחיר));

            left.appendChild(name);
            left.appendChild(price);

            // Purchase button
            const purchaseBtn = document.createElement("button");
            purchaseBtn.type = "button";
            purchaseBtn.className = "btn";
            purchaseBtn.textContent = "רכישה";

            purchaseBtn.addEventListener("click", function () {
                const pn = String(it.שםפריט || "");
                const cid = Number(it.קטגוריה);
                const p = Number(it.מחיר);
                const bal = getBalance();

                // Check if there's enough balance
                if (bal < p) {
                    showMsg("msgItems", "אין מספיק יתרה. טען קפה קרדיט ונסה שוב.", false);
                    return;
                }

                // Deduct from balance
                setBalance(bal - p);

                // Add to orders
                const orders = readArray("orders");
                orders.push({
                    תאריך: todayDDMMYYYY(),
                    שםפריט: pn,
                    קטגוריה: cid,
                    סכום: String(p.toFixed(2))
                });

                writeArray("orders", orders);
                showMsg("msgItems", "הרכישה בוצעה בהצלחה!", true);
                
                // Update dashboard and credit screen if visible
                const dash = document.getElementById("screen-dashboard");
                if (dash && dash.classList.contains("active")) {
                    renderDashboard();
                }
                const credit = document.getElementById("screen-credit");
                if (credit && credit.classList.contains("active")) {
                    renderCredit();
                }
            });

            row.appendChild(left);
            row.appendChild(purchaseBtn);

            card.appendChild(row);
            list.appendChild(card);

            // spacing
            const s = document.createElement("div");
            s.className = "sp10";
            list.appendChild(s);
        }
    }


    // ---------- Orders ----------
    function renderOrders() {
        if (!requireLoginOrGoLogin()) return;
        hideMsg("msgOrders");

        const body = document.getElementById("ordersBody");
        if (!body) return;

        while (body.firstChild) body.removeChild(body.firstChild);

        const orders = readArray("orders");

        // sort by date desc (new first)
        orders.sort(function (a, b) {
            const da = parseDDMMYYYY(a.תאריך).getTime();
            const db = parseDDMMYYYY(b.תאריך).getTime();
            return db - da;
        });

        if (orders.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 3;
            td.textContent = "";
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        for (let i = 0; i < orders.length; i++) {
            const tr = document.createElement("tr");

            const tdD = document.createElement("td");
            tdD.textContent = String(orders[i].תאריך || "");

            const tdP = document.createElement("td");
            tdP.textContent = String(orders[i].שםפריט || "");

            const tdA = document.createElement("td");
            tdA.textContent = moneyILS(Number(orders[i].סכום));

            tr.appendChild(tdD);
            tr.appendChild(tdP);
            tr.appendChild(tdA);

            body.appendChild(tr);
        }
    }

    // ---------- Credit ----------
    function renderCredit() {
        if (!requireLoginOrGoLogin()) return;
        hideMsg("msgCredit");

        const t = document.getElementById("creditBalanceText");
        if (t) t.textContent = moneyILS(getBalance());
    }

    function loadCredit() {
        const input = document.getElementById("creditAmount");
        if (!input) return;

        const val = Number(input.value);
        if (!Number.isFinite(val) || val <= 0) {
            showMsg("msgCredit", "נא להכניס סכום תקין.", false);
            return;
        }

        setBalance(getBalance() + val);
        input.value = "";
        renderCredit();
        renderDashboard();
        showMsg("msgCredit", "היתרה עודכנה בהצלחה!", true);
    }


    // ---------- Admin (JSON upload) ----------
    function readJsonFile(inputEl, cbOk, cbErr) {
        const f = inputEl && inputEl.files ? inputEl.files[0] : null;
        if (!f) {
            cbErr("נא לבחור קובץ JSON.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            try {
                const parsed = JSON.parse(String(reader.result));
                cbOk(parsed);
            } catch (e) {
                cbErr("הקובץ אינו JSON תקין.");
            }
        };
        reader.onerror = function () {
            cbErr("שגיאה בקריאת הקובץ.");
        };
        reader.readAsText(f);
    }

    function loadOrdersJson() {
        const input = document.getElementById("ordersFile");
        hideMsg("msgAdminOrders");

        readJsonFile(
            input,
            function (data) {
                if (!Array.isArray(data)) {
                    showMsg("msgAdminOrders", "ה-JSON חייב להיות מערך (Array).", false);
                    return;
                }

                // append (with no duplicates)
                const existing = readArray("orders");
                for (let i = 0; i < data.length; i++) existing.push(data[i]);
                writeArray("orders", existing);

                showMsg("msgAdminOrders", "הזמנות נטענו בהצלחה (" + String(data.length) + ").", true);
                renderDashboard();
            },
            function (err) {
                showMsg("msgAdminOrders", err, false);
            }
        );
    }

    function loadItemsJson() {
        const input = document.getElementById("itemsFile");
        hideMsg("msgAdminItems");

        readJsonFile(
            input,
            function (data) {
                if (!Array.isArray(data)) {
                    showMsg("msgAdminItems", "ה-JSON חייב להיות מערך (Array).", false);
                    return;
                }

                // write items (requirement)
                writeArray("items", data);
                showMsg("msgAdminItems", "פריטים נטענו בהצלחה (" + String(data.length) + ").", true);
            },
            function (err) {
                showMsg("msgAdminItems", err, false);
            }
        );
    }

    // ---------- Register / Login / Logout ----------
    function doRegister() {
        const nicknameInp = document.getElementById("regNickname");
        const emailInp = document.getElementById("regEmail");
        const passwordInp = document.getElementById("regPassword");
        
        if (!nicknameInp || !emailInp || !passwordInp) return;

        const nickname = nicknameInp.value.trim();
        const email = emailInp.value.trim();
        const password = passwordInp.value.trim();

        // Validation
        if (nickname === "") {
            showMsg("msgRegister", "נא להכניס כינוי.", false);
            return;
        }

        if (email === "") {
            showMsg("msgRegister", "נא להכניס אימייל.", false);
            return;
        }

        if (!validateEmail(email)) {
            showMsg("msgRegister", "נא להכניס אימייל תקין (חייב לכלול @ ו-.).", false);
            return;
        }

        if (password === "") {
            showMsg("msgRegister", "נא להכניס סיסמה.", false);
            return;
        }

        if (password.length < 8) {
            showMsg("msgRegister", "הסיסמה חייבת להכיל מינימום 8 תווים.", false);
            return;
        }

        // Check if user already exists
        const existingUser = localStorage.getItem("user");
        if (existingUser) {
            showMsg("msgRegister", "משתמש כבר קיים. נא להתחבר.", false);
            return;
        }

        // Save to localStorage
        localStorage.setItem("user", nickname);
        localStorage.setItem("email", email);
        localStorage.setItem("password", password);

        // Clear inputs
        nicknameInp.value = "";
        emailInp.value = "";
        passwordInp.value = "";
        
        hideMsg("msgRegister");
        showMsg("msgRegister", "ההרשמה בוצעה בהצלחה! מעבר למסך התחברות...", true);
        
        // Go to login screen after 1.5 seconds
        setTimeout(function() {
            showScreen("login");
        }, 1500);
    }

    function doLogin() {
        const nicknameInp = document.getElementById("loginNickname");
        const emailInp = document.getElementById("loginEmail");
        const passwordInp = document.getElementById("loginPassword");
        
        if (!nicknameInp || !emailInp || !passwordInp) return;

        const nickname = nicknameInp.value.trim();
        const email = emailInp.value.trim();
        const password = passwordInp.value.trim();

        if (nickname === "" || email === "" || password === "") {
            showMsg("msgLogin", "נא למלא את כל השדות.", false);
            return;
        }

        // Check if user exists and credentials match
        const storedNickname = localStorage.getItem("user");
        const storedEmail = localStorage.getItem("email");
        const storedPassword = localStorage.getItem("password");

        if (!storedNickname || !storedEmail || !storedPassword) {
            showMsg("msgLogin", "משתמש לא נמצא. נא להירשם תחילה.", false);
            return;
        }

        if (storedNickname !== nickname || storedEmail !== email || storedPassword !== password) {
            showMsg("msgLogin", "פרטי ההתחברות שגויים. נא לבדוק שוב.", false);
            return;
        }

        // Login successful
        nicknameInp.value = "";
        emailInp.value = "";
        passwordInp.value = "";
        hideMsg("msgLogin");
        showScreen("dashboard");
    }

    function doLogout() {
        // keep items/orders/credit for grading history, clear user
        localStorage.removeItem("user");
        localStorage.removeItem("email");
        localStorage.removeItem("password");
        showScreen("login");
    }

    // ---------- Wire UI  ----------
    function wireEvents() {
        // Registration
        const registerBtn = document.getElementById("registerBtn");
        if (registerBtn) registerBtn.addEventListener("click", doRegister);

        const goToLoginLink = document.getElementById("goToLoginLink");
        if (goToLoginLink) {
            goToLoginLink.addEventListener("click", function(e) {
                e.preventDefault();
                showScreen("login");
            });
        }

        // Login
        const loginBtn = document.getElementById("loginBtn");
        if (loginBtn) loginBtn.addEventListener("click", doLogin);

        const goToRegisterLink = document.getElementById("goToRegisterLink");
        if (goToRegisterLink) {
            goToRegisterLink.addEventListener("click", function(e) {
                e.preventDefault();
                showScreen("register");
            });
        }

        // Enter key support for login
        const loginPassword = document.getElementById("loginPassword");
        if (loginPassword) {
            loginPassword.addEventListener("keydown", function (e) {
                if (e.key === "Enter") doLogin();
            });
        }

        // Enter key support for registration
        const regPassword = document.getElementById("regPassword");
        if (regPassword) {
            regPassword.addEventListener("keydown", function (e) {
                if (e.key === "Enter") doRegister();
            });
        }

        // Dashboard buttons
        const goOrders = document.getElementById("goOrders");
        if (goOrders) goOrders.addEventListener("click", function () { showScreen("orders"); });

        const goCredit = document.getElementById("goCredit");
        if (goCredit) goCredit.addEventListener("click", function () { showScreen("credit"); });

        const goCats = document.getElementById("goCats");
        if (goCats) goCats.addEventListener("click", function () { showScreen("categories"); });

        // Items
        const backToCats = document.getElementById("backToCats");
        if (backToCats) backToCats.addEventListener("click", function () { showScreen("categories"); });

        // Orders back
        const backToDash1 = document.getElementById("backToDash1");
        if (backToDash1) backToDash1.addEventListener("click", function () { showScreen("dashboard"); });

        // Credit back + load
        const backToDash2 = document.getElementById("backToDash2");
        if (backToDash2) backToDash2.addEventListener("click", function () { showScreen("dashboard"); });

        const loadCreditBtn = document.getElementById("loadCreditBtn");
        if (loadCreditBtn) loadCreditBtn.addEventListener("click", loadCredit);

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
        // Admin load buttons
        const loadOrdersBtn = document.getElementById("loadOrdersBtn");
        if (loadOrdersBtn) loadOrdersBtn.addEventListener("click", loadOrdersJson);

        const loadItemsBtn = document.getElementById("loadItemsBtn");
        if (loadItemsBtn) loadItemsBtn.addEventListener("click", loadItemsJson);

        // Update file labels when files are selected
        const ordersFile = document.getElementById("ordersFile");
        const ordersFileLabel = document.getElementById("ordersFileLabel");
        if (ordersFile && ordersFileLabel) {
            ordersFile.addEventListener("change", function() {
                if (ordersFile.files && ordersFile.files.length > 0) {
                    ordersFileLabel.textContent = ordersFile.files[0].name;
                } else {
                    ordersFileLabel.textContent = "בחר קובץ";
                }
            });
        }

        const itemsFile = document.getElementById("itemsFile");
        const itemsFileLabel = document.getElementById("itemsFileLabel");
        if (itemsFile && itemsFileLabel) {
            itemsFile.addEventListener("change", function() {
                if (itemsFile.files && itemsFile.files.length > 0) {
                    itemsFileLabel.textContent = itemsFile.files[0].name;
                } else {
                    itemsFileLabel.textContent = "בחר קובץ";
                }
            });
        }

        // Admin back
        const backToDash3 = document.getElementById("backToDash3");
        if (backToDash3) backToDash3.addEventListener("click", function () { showScreen("dashboard"); });
    }

    // ---------- Init ----------
    function init() {
        setupTopMenu();
        setupBottomNav();
        wireEvents();

        // If image missing, avoid broken UI 
        const img = document.getElementById("logoImg");
        if (img) {
            img.addEventListener("error", function () {
                img.alt = "תמונה לא נמצאה - אפשר להחליף לקובץ תמונה מקומי בשם coffee-ph.jpg";
            });
        }

        // Start screen
        if (getUserName() === "") {
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                showScreen("register");
            } else {
                showScreen("login");
            }
        } else {
            showScreen("dashboard");
        }

        // Update clock on dashboard every 15s (simple)
        setInterval(function () {
            const dash = document.getElementById("screen-dashboard");
            if (dash && dash.classList.contains("active")) renderDashboard();
        }, 15000);
    }

    init();
})();
