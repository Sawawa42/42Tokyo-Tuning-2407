import exec from "k6/execution";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { parseHTML } from "k6/html";
import { browser } from "k6/experimental/browser";
import { createClientUrl } from "../utils.js";

// 画像の読み込みが完了している数をカウントするカウンター
const completedImageCount = new Counter("completed_load_image_count");

// 画像の読み込みが完了している数をカウント
const countCompletedImage = async (page) => {
  const htmlContent = await page.locator("#order-table").innerHTML();
  const doc = parseHTML(htmlContent).get(0);
  const images = doc.querySelectorAll("img");
  images.forEach((image) => {
    if (image.getAttribute("alt").includes("(completed)")) {
      completedImageCount.add(1);
    }
  });
};

// 2から7までの範囲に基づいてTrendメトリクスを配列に格納
// この12項目に関して、テストの結果が格納される
const loginTime = [];
const loginSuccessCounter = [];
const getPendingOrdersTime = [];
const getPendingOrdersSucceedCounter = [];
const getOrderDetailsTime = [];
const getOrderDetailsSucceedCounter = [];
const getNearestTowTruckTime = [];
const getNearestTowTruckSucceedCounter = [];
const orderDispatchTime = [];
const orderDispatchSucceedCounter = [];
const logoutTime = [];
const logoutSuccessCounter = [];

for (let i = 2; i <= 7; i++) {
  loginTime.push(new Trend(`login_time_area${i}`, true));
  loginSuccessCounter.push(new Counter(`login_success_count_area${i}`));
  getPendingOrdersTime.push(
    new Trend(`get_pending_orders_time_area${i}`, true)
  );
  getPendingOrdersSucceedCounter.push(
    new Counter(`get_pending_orders_succeed_count_area${i}`)
  );
  getOrderDetailsTime.push(new Trend(`get_order_details_time_area${i}`, true));
  getOrderDetailsSucceedCounter.push(
    new Counter(`get_order_details_succeed_count_area${i}`)
  );
  getNearestTowTruckTime.push(
    new Trend(`get_nearest_tow_truck_time_area${i}`, true)
  );
  getNearestTowTruckSucceedCounter.push(
    new Counter(`get_nearest_tow_truck_succeed_count_area${i}`)
  );
  orderDispatchTime.push(new Trend(`order_dispatch_time_area${i}`, true));
  orderDispatchSucceedCounter.push(
    new Counter(`order_dispatch_success_count_area${i}`)
  );
  logoutTime.push(new Trend(`logout_time_area${i}`, true));
  logoutSuccessCounter.push(new Counter(`logout_success_count_area${i}`));
}

export default async function dispatchTowTruck() {
  const areaId = Number(__ENV.AREA);

  const page = browser.newPage();

  try {
    // ログイン処理
    await page.goto(createClientUrl("/login"));
    const usernameInput = page.locator("#input-username");
    const passwordInput = page.locator("#input-password");
    const loginButton = page.locator("#button-login");
    const username = `dispatcher${areaId}_${
      (exec.scenario.iterationInInstance % 10) + 1
    }`;
    usernameInput.type(username);
    passwordInput.type("password");

    const loginStartTime = new Date().getTime();

    await Promise.all([page.waitForNavigation(), loginButton.click()]);

    const loginEndTime = new Date().getTime();
    const loginCheck = check(page, {
      login_success: (p) =>
        p.locator("h2").textContent() === "レッカー車配車アプリケーション",
    });

    // ログイン成功時
    if (loginCheck) {
      loginSuccessCounter[areaId - 2].add(1); // loginSuccessCounterに1を追加
      loginTime[areaId - 2].add(loginEndTime - loginStartTime); // loginTimeに時間を記録
    }

    // リクエスト一覧ページへ移動
    const requestsPageButton = page.locator("#button-requests-page");

    const getPendingOrdersStartTime = new Date().getTime();

    await Promise.all([page.waitForNavigation(), requestsPageButton.click()]);

    const getPendingOrdersEndTime = new Date().getTime();

    const getPendingOrdersCheck = check(page, {
      get_pending_orders_success: (p) =>
        p.locator("h2").textContent() === "リクエスト一覧",
    });
    // リクエスト一覧ページへの移動成功時
    if (getPendingOrdersCheck) {
      getPendingOrdersSucceedCounter[areaId - 2].add(1); // getPendingOrdersSucceedCounterに1を追加
      getPendingOrdersTime[areaId - 2].add(
        getPendingOrdersEndTime - getPendingOrdersStartTime
      ); // getPendingOrdersTimeに時間を記録
    }
    sleep(3); // 画像の読み込みのため3秒間待機
    await countCompletedImage(page);

    // リクエスト詳細画面へ移動
    const topRequestLink = page.locator("tbody tr:nth-child(1)");

    const getOrderDetailsStartTime = new Date().getTime();

    await Promise.all([page.waitForNavigation(), topRequestLink.click()]);

    const getOrderDetailsEndTime = new Date().getTime();

    const getOrderDetailsCheck = check(page, {
      get_detail_order_success: (p) =>
        p.locator("h2").textContent() === "リクエスト詳細",
    });
    // リクエスト詳細画面への移動成功時
    if (getOrderDetailsCheck) {
      getOrderDetailsSucceedCounter[areaId - 2].add(1); // getOrderDetailsSucceedCounterに1を追加
      getOrderDetailsTime[areaId - 2].add(
        getOrderDetailsEndTime - getOrderDetailsStartTime
      ); // getOrderDetailsTimeに時間を記録
    }

    // 最寄りのレッカー車を取得
    const fetchNearestButton = page.locator("#button-get-nearest");

    const getNearestTowTruckStartTime = new Date().getTime();

    await Promise.resolve(fetchNearestButton.click());
    page
      .locator("div[role='dialog']")
      .waitFor({ state: "visible", timeout: 5000 });

    const getNearestTowTruckEndTime = new Date().getTime();

    const getNearestTowTruckCheck = check(page, {
      get_nearest_tow_truck: (p) =>
        /^[0-9]+$/.test(p.locator("#tow-truck-id").textContent()),
    });
    // 最寄りのレッカー車を取得成功時
    if (getNearestTowTruckCheck) {
      getNearestTowTruckSucceedCounter[areaId - 2].add(1); // getNearestTowTruckSucceedCounterに1を追加
      getNearestTowTruckTime[areaId - 2].add(
        getNearestTowTruckEndTime - getNearestTowTruckStartTime
      ); // getNearestTowTruckTimeに時間を記録
    }

    // レッカー車を手配する操作
    const orderDispatchButton = page.locator("#button-order-dispatch");

    const orderDispatchStartTime = new Date().getTime();

    await Promise.resolve(orderDispatchButton.click());
    page.locator("#dispatch-success-message").waitFor({ state: "visible" });

    const orderDispatchEndTime = new Date().getTime();

    const orderDispatchCheck = check(page, {
      order_dispatch_success: (p) =>
        p.locator("#order-status").textContent() === "dispatched",
    });
    // レッカー車を手配成功時
    if (orderDispatchCheck) {
      orderDispatchSucceedCounter[areaId - 2].add(1); // orderDispatchSucceedCounterに1を追加
      orderDispatchTime[areaId - 2].add(
        orderDispatchEndTime - orderDispatchStartTime
      ); // orderDispatchTimeに時間を記録
    }

    // ログアウト操作
    await page.goto(createClientUrl("/"));
    const logoutButton = page.locator("#button-logout");

    const logoutStartTime = new Date().getTime();

    await Promise.resolve(logoutButton.click());
    page.locator("#button-login").waitFor({ state: "visible" });

    const logoutEndTime = new Date().getTime();

    const logoutCheck = check(page, {
      logout_success: (p) => p.locator("h2").textContent() === "ログイン",
    });
    // ログアウト成功時
    if (logoutCheck) {
      logoutSuccessCounter[areaId - 2].add(1); // logoutSuccessCounterに1を追加
      logoutTime[areaId - 2].add(logoutEndTime - logoutStartTime); // logoutTimeに時間を記録
    }
  } finally {
    page.close();
  }
}
