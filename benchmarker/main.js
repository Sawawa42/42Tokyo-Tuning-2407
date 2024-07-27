import dispatchTowTruck from "./scenarios/dispatchTowTruck.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

export const options = {
  scenarios: {
    area2: {
      executor: "shared-iterations", // 全てのVUが同じイテレーション数を実行する
      vus: 1, // 1秒あたりのユーザー数
      iterations: 4, // シナリオの実行回数
      maxDuration: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "60s"
        : "30s", // シナリオの最大実行時間
      exec: "dispatchTowTruck", // 実行する関数
      gracefulStop: "30s", // シナリオの終了時に実行される関数
      env: {
        AREA: "2",
      }, // 環境変数
      options: {
        browser: {
          type: "chromium",
        },
      }, // オプション
    },
    area3: {
      executor: "shared-iterations",
      vus: 2,
      iterations: 30,
      startTime: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "40s"
        : "20s",
      maxDuration: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "60s"
        : "30s",
      gracefulStop: "30s",
      exec: "dispatchTowTruck",
      env: {
        AREA: "3",
      },
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
    area4: {
      executor: "shared-iterations",
      vus: 2,
      iterations: 30,
      startTime: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "60s"
        : "30s",
      maxDuration: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "60s"
        : "30s",
      exec: "dispatchTowTruck",
      gracefulStop: "30s",
      env: {
        AREA: "4",
      },
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
    area5: {
      executor: "shared-iterations",
      vus: 2,
      iterations: 15,
      startTime: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "80s"
        : "40s",
      maxDuration: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "60s"
        : "30s",
      exec: "dispatchTowTruck",
      gracefulStop: "30s",
      env: {
        AREA: "5",
      },
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
    area6: {
      executor: "shared-iterations",
      vus: 2,
      iterations: 15,
      startTime: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "100s"
        : "50s",
      maxDuration: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "60s"
        : "30s",
      gracefulStop: "30s",
      exec: "dispatchTowTruck",
      env: {
        AREA: "6",
      },
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
    area7: {
      executor: "shared-iterations",
      vus: 2,
      iterations: 15,
      startTime: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "120s"
        : "60s",
      maxDuration: __ENV.CLIENT_ORIGIN_URL.includes("https://app-")
        ? "60s"
        : "30s",
      exec: "dispatchTowTruck",
      gracefulStop: "30s",
      env: {
        AREA: "7",
      },
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
  },
};

export { dispatchTowTruck };

export function handleSummary(data) {
  const rawDataFilePath = __ENV.RAW_DATA_FILE_PATH;

  return {
    [rawDataFilePath]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: "→", enableColors: true }),
  };
}
/*
1. テストのシナリオと設定
main.js の options オブジェクトには複数のテストシナリオが定義されています。各シナリオは dispatchTowTruck 関数を実行し、特定のパラメータでテストを行います。具体的には以下の点を確認します：

シナリオの名前:

area2, area3, area4, area5, area6, area7
各シナリオの設定:

executor: shared-iterations は、指定された数の VUs が指定された数のイテレーションを共有することを意味します。
vus: 仮想ユーザーの数。例えば、area2 シナリオでは 1 ユーザー、area3 では 2 ユーザーが指定されています。
iterations: 各ユーザーが実行するイテレーションの数。
startTime: シナリオの開始時間。条件によって異なる時間が指定されています。
maxDuration: シナリオの最大実行時間。
gracefulStop: シナリオの終了時に、ユーザーがテストを終了するための時間。
env: 各シナリオに渡される環境変数。ここでは AREA という環境変数が異なる値で設定されています。
2. テストの実行
dispatchTowTruck 関数が各シナリオで実行されています。この関数が何をするのかを確認することが重要です。

dispatchTowTruck 関数:
この関数は ./scenarios/dispatchTowTruck.js ファイルからインポートされています。具体的なテストの内容はこのファイルに記述されています。
例えば、レッカー車の依頼に関する API リクエストが含まれている可能性があります。dispatchTowTruck.js の中身を確認して、どのような API リクエストや操作が行われているのかを確認しましょう。
3. テストの結果処理
handleSummary 関数はテスト結果を処理します。これには以下のような処理が含まれます：

rawDataFilePath:

テスト結果が保存されるファイルパス。環境変数 RAW_DATA_FILE_PATH から取得します。
textSummary:

k6-summary ライブラリを使用して、テスト結果の要約を標準出力に表示します。
*/
