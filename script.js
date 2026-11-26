console.log("script.js 読み込み開始");
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
        .select("email, role, status, username")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        authMessage.textContent =
            "会員情報を取得できません。管理者に確認してください。";
        return;
    }

    authSection.hidden = true;
    dashboard.hidden = false;
    document.getElementById("headerControls").hidden = false;
    
    document.getElementById("userName").textContent =
    "ユーザー名：" + profile.username;
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

    document.getElementById("adminViewControls").hidden = false;

    const savedView = sessionStorage.getItem("markerAdminView");

    if (savedView === "member") {
        adminSection.hidden = true;
        memberSection.hidden = false;

        await loadMemberOptions();
        await loadUsernameSettings();
        await displayRecords();
        await loadBoardPosts();

    } else {
        adminSection.hidden = false;
        memberSection.hidden = true;

        await loadAdminOptions();
    }

} else {
    userRole.textContent = "権限：一般会員";

    document.getElementById("adminViewControls").hidden = true;
    memberSection.hidden = false;

    await loadMemberOptions();
    await loadUsernameSettings();
    await displayRecords();
    await loadBoardPosts();
}

// =====================================
// 管理者の画面切り替え
// =====================================

document.getElementById("showMemberView")
    .addEventListener("click", async () => {

        adminSection.hidden = true;
        memberSection.hidden = false;
        sessionStorage.setItem("markerAdminView", "member");

        await loadMemberOptions();
        await loadUsernameSettings();
        await displayRecords();
        await loadBoardPosts();
    });

document.getElementById("showAdminView")
    .addEventListener("click", () => {

        memberSection.hidden = true;
        adminSection.hidden = false;

        sessionStorage.setItem("markerAdminView", "admin");
    });

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
// ユーザー名の読み込み・変更
// =====================================

async function loadUsernameSettings() {

    const { data: userData } = await client.auth.getUser();

    if (!userData.user) return;

    const { data, error } = await client
        .from("profiles")
        .select("username")
        .eq("id", userData.user.id)
        .single();

    if (error) {
        document.getElementById("currentUsername").textContent =
            "読み込みエラー";
        return;
    }

    document.getElementById("currentUsername").textContent =
        data.username;

    document.getElementById("newUsername").value =
        data.username;
}


// ユーザー名の変更
document.getElementById("usernameForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const username =
            document.getElementById("newUsername").value.trim();

        const message =
            document.getElementById("usernameMessage");

        if (!username) {
            message.textContent = "ユーザー名を入力してください。";
            return;
        }

        const { data: userData } = await client.auth.getUser();

        if (!userData.user) return;

        const { error } = await client
            .from("profiles")
            .update({ username: username })
            .eq("id", userData.user.id);

        if (error) {
            if (error.code === "23505") {
                message.textContent =
                    "このユーザー名はすでに使用されています。";
            } else {
                message.textContent =
                    "変更エラー：" + error.message;
            }
            return;
        }

        document.getElementById("currentUsername").textContent =
            username;

        message.textContent = "ユーザー名を変更しました。";
    });

// =====================================
// 9. 降車記録の登録
// =====================================


// =====================================
// 一般ユーザー用：事業者・路線・駅の選択
// =====================================

let memberLinesCache = [];

// 事業者と路線を読み込む
async function loadMemberOptions() {

    const operatorSelect =
        document.getElementById("memberOperatorSelect");

    const lineSelect =
        document.getElementById("memberLineSelect");

    const stationList =
        document.getElementById("memberStationList");

    const { data: operators, error: operatorError } = await client
        .from("operators")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

    const { data: lines, error: lineError } = await client
        .from("lines")
        .select("id, name, operator_id")
        .eq("is_active", true)
        .order("name");

    if (operatorError || lineError) {
        console.error(operatorError || lineError);
        return;
    }

    memberLinesCache = lines;

    operatorSelect.innerHTML =
        '<option value="">事業者を選択してください</option>';

    operators.forEach(operator => {
        const option = document.createElement("option");
        option.value = operator.id;
        option.textContent = operator.name;
        operatorSelect.appendChild(option);
    });

    lineSelect.innerHTML =
        '<option value="">先に事業者を選択してください</option>';

    lineSelect.disabled = true;

    stationList.innerHTML =
        "<p>路線を選択してください。</p>";
}


// 事業者を選んだとき
document.getElementById("memberOperatorSelect")
    .addEventListener("change", function() {

        const operatorId = this.value;

        const lineSelect =
            document.getElementById("memberLineSelect");

        const stationList =
            document.getElementById("memberStationList");

        lineSelect.innerHTML =
            '<option value="">路線を選択してください</option>';

        stationList.innerHTML =
            "<p>路線を選択してください。</p>";

        if (!operatorId) {
            lineSelect.disabled = true;
            return;
        }

        memberLinesCache
            .filter(line =>
                String(line.operator_id) === String(operatorId)
            )
            .forEach(line => {
                const option = document.createElement("option");
                option.value = line.id;
                option.textContent = line.name;
                lineSelect.appendChild(option);
            });

        lineSelect.disabled = false;
    });


// 路線を選んだとき
document.getElementById("memberLineSelect")
    .addEventListener("change", async function() {

        const lineId = this.value;

        const stationList =
            document.getElementById("memberStationList");

        stationList.innerHTML = "<p>読み込み中...</p>";

        if (!lineId) {
            stationList.innerHTML =
                "<p>路線を選択してください。</p>";
            return;
        }

        const { data, error } = await client
            .from("station_lines")
            .select("station_id, station_order, stations(id, name, prefecture)")
            .eq("line_id", lineId)
            .order("station_order");

        if (error) {
            console.error(error);
            stationList.textContent = "駅の読み込みに失敗しました。";
            return;
        }

        stationList.innerHTML = "";

        if (!data || data.length === 0) {
            stationList.textContent =
                "この路線には登録済みの駅がありません。";
            return;
        }

        data.forEach(item => {

            const label = document.createElement("label");
            const checkbox = document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.name = "memberStation";
            checkbox.value = item.station_id;

            label.style.display = "block";
            label.style.textAlign = "left";

            label.appendChild(checkbox);
            label.appendChild(
                document.createTextNode(
                    " " + item.stations.name
                )
            );

            stationList.appendChild(label);
        });
    });

document.getElementById("recordForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const date = document.getElementById("date").value;

    const selectedStations = [
        ...document.querySelectorAll('input[name="memberStation"]:checked')
    ].map(checkbox => Number(checkbox.value));

    const message = document.getElementById("message");

    if (selectedStations.length === 0) {
        message.textContent = "駅を1つ以上選択してください。";
        return;
    }

    const { data: userData } = await client.auth.getUser();

    if (!userData.user) {
        message.textContent = "ログイン状態を確認できません。";
        return;
    }

    const recordsToInsert = selectedStations.map(stationId => ({
        user_id: userData.user.id,
        station_id: stationId,
        ride_date: date
    }));

    const { error } = await client
        .from("ride_records")
        .upsert(recordsToInsert, {
            onConflict: "user_id,station_id,ride_date",
            ignoreDuplicates: true
        });

    if (error) {
        console.error(error);
        message.textContent = "登録エラー：" + error.message;
        return;
    }

    message.textContent = "選択した駅の登録処理が完了しました。";

    document.getElementById("recordForm").reset();
    setTodayDate();

    document.getElementById("memberLineSelect").disabled = true;
    document.getElementById("memberLineSelect").innerHTML =
        '<option value="">先に事業者を選択してください</option>';

    document.getElementById("memberStationList").innerHTML =
        "<p>路線を選択してください。</p>";

    await displayRecords();
});


// =====================================
// 10. 降車記録の表示
// =====================================

async function displayRecords() {

    const recordList = document.getElementById("recordList");
    recordList.innerHTML = "読み込み中...";

    const { data: userData } = await client.auth.getUser();

    if (!userData.user) return;

    const currentUserId = userData.user.id;

    const { data: records, error } = await client
        .from("ride_records")
        .select("id, user_id, ride_date, station_id, stations(name)")
        .order("ride_date", { ascending: false });

    if (error) {
        console.error(error);
        recordList.textContent = "記録の読み込みに失敗しました。";
        return;
    }

    const userIds = [...new Set(records.map(record => record.user_id))];

    const { data: profiles, error: profileError } = await client
        .from("public_profiles")
        .select("id, username")
        .in("id", userIds);

    if (profileError) {
        console.error(profileError);
        recordList.textContent = "ユーザー情報の読み込みに失敗しました。";
        return;
    }

    const usernameMap = {};

    profiles.forEach(profile => {
        usernameMap[profile.id] = profile.username;
    });

    recordList.innerHTML = "";

    records.forEach(function(record) {

        const li = document.createElement("li");
        const text = document.createElement("span");

        const username = usernameMap[record.user_id] || "不明なユーザー";

        text.textContent =
            username + "：" +
            record.stations.name +
            "（" + record.ride_date + "）";

        li.appendChild(text);

        if (record.user_id === currentUserId) {

            const editButton = document.createElement("button");
            editButton.textContent = "編集";
            editButton.type = "button";

            editButton.addEventListener("click", async function() {

                const newDate = prompt(
                    "新しい日付を入力してください（YYYY-MM-DD）",
                    record.ride_date
                );

                if (newDate === null) return;

                if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                    alert("日付はYYYY-MM-DD形式で入力してください。");
                    return;
                }

                const { error } = await client
                    .from("ride_records")
                    .update({ ride_date: newDate })
                    .eq("id", record.id)
                    .eq("user_id", currentUserId);

                if (error) {
                    console.error(error);
                    alert("更新に失敗しました。");
                    return;
                }

                await displayRecords();
            });

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "削除";
            deleteButton.type = "button";

            deleteButton.addEventListener("click", async function() {

                const confirmed = confirm("この降車記録を削除しますか？");

                if (!confirmed) return;

                const { error } = await client
                    .from("ride_records")
                    .delete()
                    .eq("id", record.id)
                    .eq("user_id", currentUserId);

                if (error) {
                    console.error(error);
                    alert("削除に失敗しました。");
                    return;
                }

                await displayRecords();
            });

            li.appendChild(editButton);
            li.appendChild(deleteButton);
        }

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
        .eq("is_active", true)
        .order("name");

    const { data: lines, error: lineError } = await client
      .from("lines")
      .select("id, name, operator_id, operator, is_active")
      .eq("is_active", true)
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
    const unassignedRouteSelect =
    document.getElementById("unassignedRouteSelect");

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
    // 未所属路線の選択肢を作成
unassignedRouteSelect.innerHTML =
    '<option value="">未所属の路線を選択</option>';

lines
    .filter(line => line.operator_id === null)
    .forEach(line => {
        const option = document.createElement("option");
        option.value = line.id;
        option.textContent = line.name;
        unassignedRouteSelect.appendChild(option);
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
// =====================================
// 路線の駅一覧を自動保存
// =====================================

async function autoSaveRouteStations() {

    const lineId = document.getElementById("routeSelect").value;
    const message = document.getElementById("routeStationMessage");

    if (!lineId) {
        message.textContent = "路線を選択してください。";
        return false;
    }

    message.textContent = "保存中...";

    const { error: deleteError } = await client
        .from("station_lines")
        .delete()
        .eq("line_id", lineId);

    if (deleteError) {
        message.textContent = "保存エラー：" + deleteError.message;
        return false;
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
            return false;
        }
    }

    message.textContent = "自動保存しました。";
    return true;
}
function renderRouteStations() {

    const list = document.getElementById("routeStationList");
    list.innerHTML = "";

    if (routeStationsCache.length === 0) {
        list.textContent = "駅が登録されていません。";
    }

    routeStationsCache.forEach((station, index) => {

        const div = document.createElement("div");
        div.style.padding = "10px";
        div.style.margin = "6px 0";
       div.style.background = "#102638";
　　　　div.style.border = "1px solid #29495c";
　　　　div.style.color = "#e6f4fa";
        div.style.borderRadius = "6px";

        const text = document.createElement("span");
        text.textContent =
            (index + 1) + ". " + station.name +
            "（" + (station.prefecture || "") + "）";
// 操作ボタンの共通デザイン
function styleStationButton(button) {
    button.style.background = "#163449";
    button.style.color = "#e6f4fa";
    button.style.border = "1px solid #5bc7e7";
    button.style.borderRadius = "5px";
    button.style.padding = "6px 10px";
    button.style.margin = "3px";
    button.style.cursor = "pointer";
        if (button.disabled) {
        button.style.opacity = "0.35";
        button.style.cursor = "not-allowed";
    }
}
        // 上へ移動
        const upButton = document.createElement("button");
        upButton.type = "button";
        upButton.textContent = "↑";
upButton.disabled = index === 0;
styleStationButton(upButton);

        upButton.addEventListener("click", async () => {
            [routeStationsCache[index - 1], routeStationsCache[index]] =
                [routeStationsCache[index], routeStationsCache[index - 1]];

            renderRouteStations();
            await autoSaveRouteStations();
        });

        // 下へ移動
        const downButton = document.createElement("button");
        downButton.type = "button";
        downButton.textContent = "↓";
downButton.disabled = index === routeStationsCache.length - 1;
styleStationButton(downButton);

        downButton.addEventListener("click", async () => {
            [routeStationsCache[index], routeStationsCache[index + 1]] =
                [routeStationsCache[index + 1], routeStationsCache[index]];

            renderRouteStations();
            await autoSaveRouteStations();
        });

        // 駅情報を編集
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "編集";
        styleStationButton(upButton);


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
        deleteButton.textContent = "リストから削除";
        styleStationButton(upButton);

        deleteButton.addEventListener("click", async () => {

            if (!confirm(station.name + "をこの路線から削除しますか？")) {
                return;
            }

            routeStationsCache.splice(index, 1);
            renderRouteStations();

            await autoSaveRouteStations();
        });

        // 駅そのものを完全削除
        const permanentDeleteButton = document.createElement("button");
        permanentDeleteButton.type = "button";
        permanentDeleteButton.textContent = "駅を完全削除";
        styleStationButton(upButton);

        permanentDeleteButton.addEventListener("click", async () => {

            if (!confirm(
                station.name +
                "を完全削除しますか？\n" +
                "すべての路線からも削除されます。\n" +
                "乗車記録がある場合は削除できません。"
            )) return;

            const { count: recordCount, error: recordError } = await client
                .from("ride_records")
                .select("*", { count: "exact", head: true })
                .eq("station_id", station.id);

            if (recordError) {
                alert("乗車記録確認エラー：" + recordError.message);
                return;
            }

            if (recordCount > 0) {
                alert("この駅には乗車記録があるため、完全削除できません。");
                return;
            }

            const { error: linkDeleteError } = await client
                .from("station_lines")
                .delete()
                .eq("station_id", station.id);

            if (linkDeleteError) {
                alert("路線との紐づけ削除エラー：" + linkDeleteError.message);
                return;
            }

            const { error } = await client
                .from("stations")
                .delete()
                .eq("id", station.id);

            if (error) {
                alert("駅の完全削除エラー：" + error.message);
                return;
            }

            await loadAdminOptions(
                document.getElementById("operatorSelect").value,
                document.getElementById("routeSelect").value
            );

            alert("駅を完全削除しました。");
        });

        div.appendChild(text);
        div.appendChild(upButton);
        div.appendChild(downButton);
        div.appendChild(editButton);
        div.appendChild(deleteButton);
        div.appendChild(permanentDeleteButton);

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

    if (!confirm(
        operator.name +
        "と、その事業者に属する全路線を完全削除します。\n駅そのものと乗車記録は残ります。\n本当に削除しますか？"
    )) return;

    // 対象路線を取得
    const { data: lines, error: selectError } = await client
        .from("lines")
        .select("id")
        .eq("operator_id", operatorId);

    if (selectError) {
        alert("路線取得エラー：" + selectError.message);
        return;
    }

    const lineIds = lines.map(line => line.id);

    // 駅と路線の紐づけを削除
    if (lineIds.length > 0) {

        const { error: stationError } = await client
            .from("station_lines")
            .delete()
            .in("line_id", lineIds);

        if (stationError) {
            alert("駅の紐づけ削除エラー：" + stationError.message);
            return;
        }

        // 路線を削除
        const { error: lineError } = await client
            .from("lines")
            .delete()
            .eq("operator_id", operatorId);

        if (lineError) {
            alert("路線削除エラー：" + lineError.message);
            return;
        }
    }

    // 事業者を削除
    const { error } = await client
        .from("operators")
        .delete()
        .eq("id", operatorId);

    if (error) {
        alert("事業者削除エラー：" + error.message);
        return;
    }

    await loadAdminOptions();

    alert("事業者と所属路線を完全削除しました。");
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

    if (!confirm(
        line.name +
        "を完全削除します。\n駅そのものと乗車記録は残ります。\n本当に削除しますか？"
    )) return;

    // 駅と路線の紐づけを削除
    const { error: stationError } = await client
        .from("station_lines")
        .delete()
        .eq("line_id", lineId);

    if (stationError) {
        alert("駅の紐づけ削除エラー：" + stationError.message);
        return;
    }

    // 路線を完全削除
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

    alert("路線を完全削除しました。");
});



// =====================================
// 路線に駅を追加（オートセーブ）
// =====================================

document.getElementById("addStationToRoute")
    .addEventListener("click", async () => {

        const stationId = document.getElementById("stationToAdd").value;
        const message = document.getElementById("routeStationMessage");
        const lineId = document.getElementById("routeSelect").value;

        if (!lineId) {
            message.textContent = "先に路線を選択してください。";
            return;
        }

        let station;

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

            station = data;
            allStationsCache.push(data);

            const option = document.createElement("option");
            option.value = data.id;
            option.textContent =
                data.name + "（" + (data.prefecture || "") + "）";

            document.getElementById("stationToAdd").appendChild(option);

        } else {

            // 既存駅を取得
            station = allStationsCache.find(
                item => String(item.id) === stationId
            );

            if (!station) return;
        }

        // 重複確認
        if (routeStationsCache.some(
            item => String(item.id) === String(station.id)
        )) {
            message.textContent = "この駅はすでに登録されています。";
            return;
        }

        // Supabaseへ直接追加
        const { error } = await client
            .from("station_lines")
            .insert({
                station_id: Number(station.id),
                line_id: Number(lineId),
                station_order: routeStationsCache.length + 1
            });

        if (error) {
            message.textContent = "追加エラー：" + error.message;
            return;
        }

        routeStationsCache.push(station);
        renderRouteStations();

        message.textContent =
            station.name + "を追加し、自動保存しました。";
    });


// =====================================
// 選択変更時の処理
// =====================================

document.getElementById("operatorSelect")
    .addEventListener("change", () => loadRoutesForOperator());

document.getElementById("routeSelect")
    .addEventListener("change", loadStationsForRoute);

// =====================================
// リストから削除する処理
// =====================================


// 路線をリストから削除
document.getElementById("removeRoute")
    .addEventListener("click", async () => {

        const lineId =
            document.getElementById("routeSelect").value;

        if (!lineId) {
            alert("路線を選択してください。");
            return;
        }

        const line = routeLinesCache.find(
            item => String(item.id) === lineId
        );

        if (!confirm(
            line.name +
            "と現在の事業者との紐づけを解除しますか？"
        )) {
            return;
        }

        const { error } = await client
            .from("lines")
            .update({
                operator_id: null,
                operator: ""
            })
            .eq("id", lineId);

        if (error) {
            alert("紐づけ解除エラー：" + error.message);
            return;
        }

        await loadAdminOptions(
            document.getElementById("operatorSelect").value
        );

        alert("事業者との紐づけを解除しました。");
    });
    // 未所属路線を事業者に割り当てる
document.getElementById("assignRoute")
    .addEventListener("click", async () => {

        const operatorId =
            document.getElementById("operatorSelect").value;

        const lineId =
            document.getElementById("unassignedRouteSelect").value;

        if (!operatorId) {
            alert("先に事業者を選択してください。");
            return;
        }

        if (!lineId) {
            alert("未所属の路線を選択してください。");
            return;
        }

        const operator = operatorsCache.find(
            item => String(item.id) === operatorId
        );

        const line = routeLinesCache.find(
            item => String(item.id) === lineId
        );

        if (!confirm(
            line.name + "を" + operator.name + "に割り当てますか？"
        )) return;

        const { error } = await client
            .from("lines")
            .update({
                operator_id: Number(operatorId),
                operator: operator.name
            })
            .eq("id", lineId);

        if (error) {
            alert("割り当てエラー：" + error.message);
            return;
        }

        await loadAdminOptions(operatorId, lineId);

        alert("路線を割り当てました。");
    });
console.log("路線削除イベント登録コードまで到達");

// =====================================
// 日付欄に今日の日付を設定
// =====================================

function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    document.getElementById("date").value =
        `${year}-${month}-${day}`;
}

setTodayDate();

// =====================================
// COMMUNITY BOARD / 投稿機能
// =====================================

// 投稿一覧を読み込む

// =====================================
// COMMUNITY BOARD / 投稿・いいね表示
// =====================================


async function loadBoardPosts() {
    const postList = document.getElementById("boardPostList");

    postList.textContent = "投稿を読み込んでいます...";

    const { data: userData } = await client.auth.getUser();

    if (!userData.user) {
        postList.textContent = "ログインしてください。";
        return;
    }

    const currentUserId = userData.user.id;

    // 自分の権限を取得
    const { data: myProfile, error: myProfileError } = await client
        .from("profiles")
        .select("role")
        .eq("id", currentUserId)
        .single();

    if (myProfileError) {
        console.error(myProfileError);
        postList.textContent = "ユーザー情報を取得できません。";
        return;
    }

    const isAdmin = myProfile.role === "admin";

    // 投稿を取得
    const { data: posts, error } = await client
        .from("board_posts")
        .select("id, user_id, title, content, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        postList.textContent = "投稿の読み込みに失敗しました。";
        return;
    }

    if (!posts || posts.length === 0) {
        postList.textContent = "まだ投稿はありません。";
        return;
    }

    // 投稿者のユーザー名を取得
    const userIds = [...new Set(posts.map(post => post.user_id))];

    const { data: profiles, error: profileError } = await client
        .from("public_profiles")
        .select("id, username")
        .in("id", userIds);

    if (profileError) {
        console.error(profileError);
    }

    const usernameMap = new Map(
        (profiles || []).map(profile => [profile.id, profile.username])
    );

    // いいね情報を取得
    const postIds = posts.map(post => post.id);

    const { data: likes, error: likesError } = await client
        .from("board_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

    if (likesError) {
        console.error(likesError);
        postList.textContent = "いいね情報の読み込みに失敗しました。";
        return;
    }

    const likeCounts = new Map();
    const likedPostIds = new Set();

    (likes || []).forEach(like => {
        likeCounts.set(
            like.post_id,
            (likeCounts.get(like.post_id) || 0) + 1
        );

        if (like.user_id === currentUserId) {
            likedPostIds.add(like.post_id);
        }
    });

    postList.innerHTML = "";

    posts.forEach(post => {
        const article = document.createElement("article");
        article.className = "board-post";

        const title = document.createElement("h4");
        title.textContent = post.title;

        const content = document.createElement("p");
        content.textContent = post.content;

        const meta = document.createElement("p");
        meta.className = "board-post-meta";

        const username = usernameMap.get(post.user_id) || "退会済みユーザー";
        const date = new Date(post.created_at).toLocaleString("ja-JP");

        meta.textContent = `${username} ｜ ${date}`;

        // いいねボタン
        const likeButton = document.createElement("button");
        likeButton.type = "button";
        likeButton.className = "board-like-button";

        const updateLikeButton = () => {
            const count = likeCounts.get(post.id) || 0;
            const isLiked = likedPostIds.has(post.id);

            likeButton.textContent =
                `${isLiked ? "♥" : "♡"} いいね ${count}`;

            likeButton.classList.toggle("liked", isLiked);
        };

        updateLikeButton();

        likeButton.addEventListener("click", async () => {
            likeButton.disabled = true;

            let result;

            if (likedPostIds.has(post.id)) {
                result = await client
                    .from("board_likes")
                    .delete()
                    .eq("post_id", post.id)
                    .eq("user_id", currentUserId);
            } else {
                result = await client
                    .from("board_likes")
                    .insert({
                        post_id: post.id,
                        user_id: currentUserId
                    });
            }

            if (result.error) {
                console.error(result.error);
                alert("いいねの更新に失敗しました。");
                likeButton.disabled = false;
                return;
            }

            await loadBoardPosts();
        });

        article.appendChild(title);
        article.appendChild(content);
        article.appendChild(meta);
        article.appendChild(likeButton);

        // 自分の投稿または管理者の場合に操作ボタンを表示
        if (post.user_id === currentUserId || isAdmin) {

            // 編集ボタン（自分の投稿のみ）
            if (post.user_id === currentUserId) {
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.textContent = "編集";

                editButton.addEventListener("click", async () => {
                    const newTitle = prompt("新しいタイトルを入力してください。", post.title);

                    if (newTitle === null) return;

                    const newContent = prompt("新しい投稿内容を入力してください。", post.content);

                    if (newContent === null) return;

                    if (!newTitle.trim() || !newContent.trim()) {
                        alert("タイトルと投稿内容は空欄にできません。");
                        return;
                    }

                    const { error } = await client
                        .from("board_posts")
                        .update({
                            title: newTitle.trim(),
                            content: newContent.trim(),
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", post.id);

                    if (error) {
                        console.error(error);
                        alert("編集に失敗しました。");
                        return;
                    }

                    await loadBoardPosts();
                });

                article.appendChild(editButton);
            }

            // 削除ボタン
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "削除";

            deleteButton.addEventListener("click", async () => {
                const confirmed = confirm("この投稿を削除しますか？");

                if (!confirmed) return;

                const { error } = await client
                    .from("board_posts")
                    .delete()
                    .eq("id", post.id);

                if (error) {
                    console.error(error);
                    alert("削除に失敗しました。");
                    return;
                }

                await loadBoardPosts();
            });

            article.appendChild(deleteButton);
        }

        postList.appendChild(article);
    });
}



// 新規投稿
document.getElementById("boardPostForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const title = document.getElementById("boardTitle").value.trim();
        const content = document.getElementById("boardContent").value.trim();
        const message = document.getElementById("boardMessage");

        if (!title || !content) {
            message.textContent = "タイトルと投稿内容を入力してください。";
            return;
        }

        const { data: userData } = await client.auth.getUser();

        if (!userData.user) {
            message.textContent = "ログイン状態を確認できません。";
            return;
        }

        const { error } = await client
            .from("board_posts")
            .insert({
                user_id: userData.user.id,
                title: title,
                content: content
            });

        if (error) {
            console.error(error);
            message.textContent = "投稿エラー：" + error.message;
            return;
        }

        message.textContent = "投稿しました！";

        document.getElementById("boardPostForm").reset();

        await loadBoardPosts();
    });

