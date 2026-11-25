
// =====================================
// 1. Supabaseへの接続
// =====================================

const SUPABASE_URL = "https://ryhemxqidpgmfppjqnrl.supabase.co";

const SUPABASE_KEY = "sb_publishable_R4s7yuDHAGQsimItJdSOPA_zKKP9LDH";

const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =====================================
// 2. HTML要素の取得
// =====================================

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const registerSection = document.getElementById("registerSection");
const authMessage = document.getElementById("authMessage");

const userEmail = document.getElementById("userEmail");
const userRole = document.getElementById("userRole");

const pendingSection = document.getElementById("pendingSection");
const memberSection = document.getElementById("memberSection");
const adminSection = document.getElementById("adminSection");


// =====================================
// 3. ログイン画面と登録画面の切り替え
// =====================================

document.getElementById("showRegister").addEventListener("click", function() {
    loginForm.parentElement.hidden = true;
    registerSection.hidden = false;
    authMessage.textContent = "";
});

document.getElementById("showLogin").addEventListener("click", function() {
    loginForm.parentElement.hidden = false;
    registerSection.hidden = true;
    authMessage.textContent = "";
});


// =====================================
// 4. 新規会員登録
// =====================================

registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    authMessage.textContent = "登録しています...";

    const { data, error } = await client.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        authMessage.textContent = "登録エラー：" + error.message;
        return;
    }

    if (data.session) {
        authMessage.textContent = "登録しました。";
        await loadDashboard(data.session.user);
    } else {
        authMessage.textContent =
            "確認メールを送りました。メール内のリンクを開いてください。";
    }
});


// =====================================
// 5. ログイン
// =====================================

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    authMessage.textContent = "ログインしています...";

    const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        authMessage.textContent = "ログインエラー：" + error.message;
        return;
    }

    await loadDashboard(data.user);
});


// =====================================
// 6. ログイン後の画面表示
// =====================================

async function loadDashboard(user) {

    const { data: profile, error } = await client
        .from("profiles")
        .select("email, role, status")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        authMessage.textContent =
            "会員情報を取得できません。管理者に確認してください。";
        return;
    }

    authSection.hidden = true;
    dashboard.hidden = false;

    userEmail.textContent = user.email;

    pendingSection.hidden = true;
    memberSection.hidden = true;
    adminSection.hidden = true;

    if (profile.status !== "approved") {
        userRole.textContent = "承認状態：承認待ち";
        pendingSection.hidden = false;
        return;
    }

   if (profile.role === "admin") {
    userRole.textContent = "権限：管理者";
    adminSection.hidden = false;
    await loadAdminOptions();
}else {
        userRole.textContent = "権限：一般会員";
        memberSection.hidden = false;
        await loadStations();
        await displayRecords();
    }
}


// =====================================
// 7. ログアウト
// =====================================

document.getElementById("logoutButton").addEventListener("click", async function() {

    const { error } = await client.auth.signOut();

    if (error) {
        alert("ログアウトできませんでした：" + error.message);
        return;
    }

    location.reload();
});


// =====================================
// 8. 駅一覧を取得
// =====================================

async function loadStations() {

    const stationInput = document.getElementById("station");

    // 自由入力欄を選択欄に変更
    const stationSelect = document.createElement("select");
    stationSelect.id = "station";
    stationSelect.required = true;

    stationSelect.innerHTML = '<option value="">駅を選択してください</option>';

    stationInput.replaceWith(stationSelect);

    const { data, error } = await client
        .from("stations")
        .select("id, name")
        .order("name");

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(function(station) {
        const option = document.createElement("option");
        option.value = station.id;
        option.textContent = station.name;
        stationSelect.appendChild(option);
    });
}


// =====================================
// 9. 降車記録の登録
// =====================================

document.getElementById("recordForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const stationId = document.getElementById("station").value;
    const date = document.getElementById("date").value;

    const { data: userData } = await client.auth.getUser();

    const { error } = await client
        .from("ride_records")
        .insert({
            user_id: userData.user.id,
            station_id: stationId,
            ride_date: date
        });

    const message = document.getElementById("message");

    if (error) {
        message.textContent = "登録エラー：" + error.message;
        return;
    }

    message.textContent = "降車記録を登録しました！";

    document.getElementById("recordForm").reset();

    await displayRecords();
});


// =====================================
// 10. 降車記録の表示
// =====================================

async function displayRecords() {

    const recordList = document.getElementById("recordList");
    recordList.innerHTML = "";

    const { data, error } = await client
        .from("ride_records")
        .select("id, ride_date, station_id, stations(name)")
        .order("ride_date", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(function(record) {

        const li = document.createElement("li");

        const text = document.createElement("span");

        text.textContent =
            record.stations.name + "（" + record.ride_date + "）";

        li.appendChild(text);

        recordList.appendChild(li);
    });
}

// =====================================
// 13. ログイン状態の確認
// =====================================

async function checkLogin() {

    const { data, error } = await client.auth.getSession();

    if (error) {
        console.error(error);
        return;
    }

    if (data.session) {
        await loadDashboard(data.session.user);
    }
}

checkLogin();


// ログイン状態が変わったときに画面を更新
client.auth.onAuthStateChange(function(event, session) {

    if (event === "SIGNED_IN" && session) {
        loadDashboard(session.user);
    }

    if (event === "SIGNED_OUT") {
        location.reload();
    }
});


// =====================================
// 登録済み路線の表示・編集・削除
// =====================================

async function displayLines() {
    const lineList = document.getElementById("lineList");
    lineList.innerHTML = "読み込み中...";

    const { data, error } = await client
        .from("lines")
        .select("*")
        .order("name");

    if (error) {
        lineList.textContent = "取得エラー：" + error.message;
        return;
    }

    if (data.length === 0) {
        lineList.textContent = "登録されている路線はありません。";
        return;
    }

    lineList.innerHTML = "";

    data.forEach(line => {
        const item = document.createElement("div");
        item.style.padding = "12px";
        item.style.margin = "10px 0";
        item.style.background = "#eef2f6";
        item.style.borderRadius = "8px";

        const info = document.createElement("p");
        info.textContent = line.name + "（" + line.operator + "）";

        const editButton = document.createElement("button");
        editButton.textContent = "編集";

        editButton.addEventListener("click", async () => {
            const newName = prompt("新しい路線名", line.name);
            if (newName === null || newName.trim() === "") return;

            const newOperator = prompt("新しい運営会社", line.operator);
            if (newOperator === null || newOperator.trim() === "") return;

            const { error } = await client
                .from("lines")
                .update({
                    name: newName.trim(),
                    operator: newOperator.trim()
                })
                .eq("id", line.id);

            if (error) {
                alert("更新エラー：" + error.message);
                return;
            }

            await displayLines();
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "削除";
        deleteButton.style.background = "#c0392b";

        deleteButton.addEventListener("click", async () => {
            if (!confirm(line.name + "を削除しますか？")) return;

            const { error } = await client
                .from("lines")
                .delete()
                .eq("id", line.id);

            if (error) {
                alert("削除エラー：" + error.message);
                return;
            }

            await displayLines();
        });

        item.appendChild(info);
        item.appendChild(editButton);
        item.appendChild(deleteButton);
        lineList.appendChild(item);
    });
}
// =====================================
// 駅と路線の選択肢を読み込む
// =====================================


let routeLinesCache = [];
let routeStationsCache = [];
let allStationsCache = [];

// =====================================
// 15. 新しい管理画面
// =====================================

let operatorsCache = [];

// 管理画面の初期読み込み
async function loadAdminOptions(selectedOperatorId = "", selectedLineId = "") {

    const message = document.getElementById("routeStationMessage");

    const { data: operators, error: operatorError } = await client
        .from("operators")
        .select("id, name")
        .order("name");

    const { data: lines, error: lineError } = await client
        .from("lines")
        .select("id, name, operator_id, operator")
        .order("name");

    const { data: stations, error: stationError } = await client
        .from("stations")
        .select("id, name, prefecture")
        .order("name");

    if (operatorError || lineError || stationError) {
        message.textContent =
            "読み込みエラー：" +
            (operatorError?.message ||
             lineError?.message ||
             stationError?.message);
        return;
    }

    operatorsCache = operators;
    routeLinesCache = lines;
    allStationsCache = stations;

    const operatorSelect = document.getElementById("operatorSelect");
    const stationToAdd = document.getElementById("stationToAdd");

    operatorSelect.innerHTML =
        '<option value="">事業者を選択</option>';

    operators.forEach(operator => {
        const option = document.createElement("option");
        option.value = operator.id;
        option.textContent = operator.name;
        operatorSelect.appendChild(option);
    });

    stationToAdd.innerHTML =
        '<option value="">駅を選択</option>';

    stations.forEach(station => {
        const option = document.createElement("option");
        option.value = station.id;
        option.textContent =
            station.name + "（" + (station.prefecture || "") + "）";
        stationToAdd.appendChild(option);
    });

    operatorSelect.value = selectedOperatorId;

    await loadRoutesForOperator(selectedLineId);

    message.textContent = "";
}


// 事業者に応じて路線を表示
async function loadRoutesForOperator(selectedLineId = "") {

    const operatorId =
        document.getElementById("operatorSelect").value;

    const routeSelect = document.getElementById("routeSelect");

    routeSelect.innerHTML =
        '<option value="">路線を選択</option>';

    routeStationsCache = [];

    document.getElementById("routeStationList").innerHTML =
        "<p>路線を選択してください。</p>";

    if (!operatorId) return;

    routeLinesCache
        .filter(line => String(line.operator_id) === String(operatorId))
        .forEach(line => {
            const option = document.createElement("option");
            option.value = line.id;
            option.textContent = line.name;
            routeSelect.appendChild(option);
        });

    if (selectedLineId) {
        routeSelect.value = selectedLineId;
        await loadStationsForRoute();
    }
}


// 選択した路線の駅を読み込む
async function loadStationsForRoute() {

    const lineId = document.getElementById("routeSelect").value;
    const message = document.getElementById("routeStationMessage");

    routeStationsCache = [];

    if (!lineId) {
        renderRouteStations();
        return;
    }

    const { data, error } = await client
        .from("station_lines")
        .select("station_id, station_order, stations(id, name, prefecture)")
        .eq("line_id", lineId)
        .order("station_order");

    if (error) {
        message.textContent = "読み込みエラー：" + error.message;
        return;
    }

    routeStationsCache = data.map(item => ({
        id: item.stations.id,
        name: item.stations.name,
        prefecture: item.stations.prefecture
    }));

    renderRouteStations();
}


// 駅一覧を画面に表示
function renderRouteStations() {

    const list = document.getElementById("routeStationList");
    list.innerHTML = "";

    if (routeStationsCache.length === 0) {
        list.textContent = "駅が登録されていません。";
        return;
    }

    routeStationsCache.forEach((station, index) => {

        const div = document.createElement("div");
        div.style.padding = "10px";
        div.style.margin = "6px 0";
        div.style.background = "#eef2f6";
        div.style.borderRadius = "6px";

        const text = document.createElement("span");
        text.textContent =
            (index + 1) + ". " + station.name +
            "（" + (station.prefecture || "") + "）";

        // 上へ移動
        const upButton = document.createElement("button");
        upButton.type = "button";
        upButton.textContent = "↑";
        upButton.disabled = index === 0;

        upButton.addEventListener("click", () => {
            [routeStationsCache[index - 1], routeStationsCache[index]] =
                [routeStationsCache[index], routeStationsCache[index - 1]];
            renderRouteStations();
        });

        // 下へ移動
        const downButton = document.createElement("button");
        downButton.type = "button";
        downButton.textContent = "↓";
        downButton.disabled = index === routeStationsCache.length - 1;

        downButton.addEventListener("click", () => {
            [routeStationsCache[index], routeStationsCache[index + 1]] =
                [routeStationsCache[index + 1], routeStationsCache[index]];
            renderRouteStations();
        });

        // 駅情報を編集
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "編集";

        editButton.addEventListener("click", async () => {

            const newName = prompt("新しい駅名", station.name);
            if (newName === null || newName.trim() === "") return;

            const newPrefecture = prompt(
                "都道府県",
                station.prefecture || ""
            );

            if (newPrefecture === null) return;

            const { error } = await client
                .from("stations")
                .update({
                    name: newName.trim(),
                    prefecture: newPrefecture.trim()
                })
                .eq("id", station.id);

            if (error) {
                alert("編集エラー：" + error.message);
                return;
            }

            await loadAdminOptions(
                document.getElementById("operatorSelect").value,
                document.getElementById("routeSelect").value
            );
        });

        // この路線から駅を削除
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "削除";

        deleteButton.addEventListener("click", () => {
            routeStationsCache.splice(index, 1);
            renderRouteStations();
        });

        div.appendChild(text);
        div.appendChild(upButton);
        div.appendChild(downButton);
        div.appendChild(editButton);
        div.appendChild(deleteButton);

        list.appendChild(div);
    });
}


// =====================================
// 事業者の追加・編集・削除
// =====================================

document.getElementById("addOperator").addEventListener("click", async () => {

    const name = prompt("新しい事業者名");

    if (name === null || name.trim() === "") return;

    const { data, error } = await client
        .from("operators")
        .insert({ name: name.trim() })
        .select()
        .single();

    if (error) {
        alert("追加エラー：" + error.message);
        return;
    }

    await loadAdminOptions(data.id);
});


document.getElementById("editOperator").addEventListener("click", async () => {

    const select = document.getElementById("operatorSelect");
    const operatorId = select.value;

    if (!operatorId) {
        alert("事業者を選択してください。");
        return;
    }

    const operator = operatorsCache.find(
        item => String(item.id) === operatorId
    );

    const newName = prompt("新しい事業者名", operator.name);

    if (newName === null || newName.trim() === "") return;

    const { error } = await client
        .from("operators")
        .update({ name: newName.trim() })
        .eq("id", operatorId);

    if (error) {
        alert("編集エラー：" + error.message);
        return;
    }

    await client
        .from("lines")
        .update({ operator: newName.trim() })
        .eq("operator_id", operatorId);

    await loadAdminOptions(operatorId);
});


document.getElementById("deleteOperator").addEventListener("click", async () => {

    const operatorId = document.getElementById("operatorSelect").value;

    if (!operatorId) {
        alert("事業者を選択してください。");
        return;
    }

    const operator = operatorsCache.find(
        item => String(item.id) === operatorId
    );

    if (!confirm(operator.name + "を削除しますか？")) return;

    const { error } = await client
        .from("operators")
        .delete()
        .eq("id", operatorId);

    if (error) {
        alert("削除エラー：" + error.message +
            "\nこの事業者に路線が残っていないか確認してください。");
        return;
    }

    await loadAdminOptions();
});


// =====================================
// 路線の追加・編集・削除
// =====================================

document.getElementById("addRoute").addEventListener("click", async () => {

    const operatorId = document.getElementById("operatorSelect").value;

    if (!operatorId) {
        alert("先に事業者を選択してください。");
        return;
    }

    const operator = operatorsCache.find(
        item => String(item.id) === operatorId
    );

    const name = prompt("新しい路線名");

    if (name === null || name.trim() === "") return;

    const { data, error } = await client
        .from("lines")
        .insert({
            name: name.trim(),
            operator_id: Number(operatorId),
            operator: operator.name
        })
        .select()
        .single();

    if (error) {
        alert("追加エラー：" + error.message);
        return;
    }

    await loadAdminOptions(operatorId, data.id);
});


document.getElementById("editRoute").addEventListener("click", async () => {

    const lineId = document.getElementById("routeSelect").value;

    if (!lineId) {
        alert("路線を選択してください。");
        return;
    }

    const line = routeLinesCache.find(
        item => String(item.id) === lineId
    );

    const newName = prompt("新しい路線名", line.name);

    if (newName === null || newName.trim() === "") return;

    const { error } = await client
        .from("lines")
        .update({ name: newName.trim() })
        .eq("id", lineId);

    if (error) {
        alert("編集エラー：" + error.message);
        return;
    }

    await loadAdminOptions(
        document.getElementById("operatorSelect").value,
        lineId
    );
});


document.getElementById("deleteRoute").addEventListener("click", async () => {

    const lineId = document.getElementById("routeSelect").value;

    if (!lineId) {
        alert("路線を選択してください。");
        return;
    }

    const line = routeLinesCache.find(
        item => String(item.id) === lineId
    );

    if (!confirm(line.name + "を削除しますか？")) return;

    const { error: stationError } = await client
        .from("station_lines")
        .delete()
        .eq("line_id", lineId);

    if (stationError) {
        alert("駅の紐づけ削除エラー：" + stationError.message);
        return;
    }

    const { error } = await client
        .from("lines")
        .delete()
        .eq("id", lineId);

    if (error) {
        alert("路線削除エラー：" + error.message);
        return;
    }

    await loadAdminOptions(
        document.getElementById("operatorSelect").value
    );
});

// =====================================
// 路線に駅を追加
// =====================================

document.getElementById("addStationToRoute")
    .addEventListener("click", async () => {

        const stationId = document.getElementById("stationToAdd").value;
        const message = document.getElementById("routeStationMessage");

        const lineId = document.getElementById("routeSelect").value;
        const operatorId = document.getElementById("operatorSelect").value;

        if (!lineId) {
            message.textContent = "先に路線を選択してください。";
            return;
        }

        // 駅が未選択なら新規登録
        if (!stationId) {

            const createNew = confirm(
                "駅が選択されていません。新しい駅を登録しますか？"
            );

            if (!createNew) return;

            const name = prompt("新しい駅名");
            if (name === null || name.trim() === "") return;

            const prefecture = prompt("都道府県");
            if (prefecture === null) return;

            const { data, error } = await client
                .from("stations")
                .insert({
                    name: name.trim(),
                    prefecture: prefecture.trim()
                })
                .select()
                .single();

            if (error) {
                message.textContent = "駅の登録エラー：" + error.message;
                return;
            }

            allStationsCache.push(data);

            const option = document.createElement("option");
            option.value = data.id;
            option.textContent =
                data.name + "（" + (data.prefecture || "") + "）";

            document.getElementById("stationToAdd").appendChild(option);

            routeStationsCache.push(data);
            renderRouteStations();

            message.textContent =
                data.name + "を登録しました。変更を保存してください。";

            return;
        }

        // 既存駅を追加
        const station = allStationsCache.find(
            item => String(item.id) === stationId
        );

        if (!station) return;

        if (routeStationsCache.some(
            item => String(item.id) === stationId
        )) {
            message.textContent = "この駅はすでに登録されています。";
            return;
        }

        routeStationsCache.push(station);
        renderRouteStations();

        message.textContent =
            station.name + "を追加しました。変更を保存してください。";
    });

// =====================================
// 路線の駅一覧を保存
// =====================================

document.getElementById("saveRouteStations")
    .addEventListener("click", async () => {

        const lineId = document.getElementById("routeSelect").value;
        const message = document.getElementById("routeStationMessage");

        if (!lineId) {
            message.textContent = "路線を選択してください。";
            return;
        }

        const { error: deleteError } = await client
            .from("station_lines")
            .delete()
            .eq("line_id", lineId);

        if (deleteError) {
            message.textContent = "削除エラー：" + deleteError.message;
            return;
        }

        if (routeStationsCache.length > 0) {

            const records = routeStationsCache.map((station, index) => ({
                station_id: Number(station.id),
                line_id: Number(lineId),
                station_order: index + 1
            }));

            const { error: insertError } = await client
                .from("station_lines")
                .insert(records);

            if (insertError) {
                message.textContent = "保存エラー：" + insertError.message;
                return;
            }
        }

        message.textContent = "路線の駅一覧を保存しました！";

        await loadStationsForRoute();
    });


// =====================================
// 選択変更時の処理
// =====================================

document.getElementById("operatorSelect")
    .addEventListener("change", () => loadRoutesForOperator());

document.getElementById("routeSelect")
    .addEventListener("change", loadStationsForRoute);

