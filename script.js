// =========================
// 要素取得
// =========================

const result = document.getElementById("result");
const count = document.getElementById("count");
const lineCount = document.getElementById("lineCount");
const timerDisplay = document.getElementById("timer");
const statusDisplay = document.getElementById("status");
const summaryArea = document.getElementById("summaryArea");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

// =========================
// スリープ防止
// =========================

let wakeLock = null;
let mediaStream = null;
let mediaRecorder;
let audioChunks = [];

async function requestWakeLock() {

    try {

        if ("wakeLock" in navigator) {

            wakeLock =
                await navigator.wakeLock.request(
                    "screen"
                );

            console.log(
                "スリープ防止ON"
            );

        }

    } catch (err) {

        console.error(err);

    }

}

// =========================
// 音声認識対応チェック
// =========================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (!SpeechRecognition) {

    alert(
        "このブラウザは音声認識に対応していません。\nChromeをご利用ください。"
    );

    throw new Error(
        "Speech Recognition unsupported"
    );

}

const recognition = new SpeechRecognition();

recognition.lang = "ja-JP";
recognition.continuous = true;
recognition.interimResults = true;

recognition.onstart = () => {
    console.log("認識開始");
};

recognition.onend = () => {
    console.log("認識終了");
};

recognition.onerror = (event) => {
    console.error("認識エラー:", event.error);
};

navigator.mediaDevices.enumerateDevices()
.then(devices => {
    devices.forEach(device => {
        if (device.kind === "audioinput") {
            console.log(
                "マイク:",
                device.label,
                device.deviceId
            );
        }
    });
});

// =========================
// 変数
// =========================

let finalTranscript = "";

let isRecording = false;

let timerInterval;
let seconds = 0;

// =========================
// 録音開始
// =========================

startBtn.addEventListener("click", async () => {

    if (isRecording) return;

    // タイマー初期化
    seconds = 0;
    timerDisplay.textContent = "00:00:00";

    try {

        await requestWakeLock();

        // 音声録音開始
        mediaStream =
          await navigator.mediaDevices.getUserMedia({
            audio: true
          });

        console.log(
            "取得したトラック:",
            mediaStream.getAudioTracks()
        );

        console.log(
            "設定:",
            mediaStream.getAudioTracks()[0].getSettings()
        );

        mediaRecorder = new MediaRecorder(mediaStream);

        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {

            const audioBlob =
                new Blob(audioChunks, {
                    type: "audio/webm"
                });

            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement("a");
            a.href = url;
            const now = new Date();

            a.download =
             `文字起こし_${
                now.getFullYear()
             }-${
                now.getMonth()+1
             }-${
                now.getDate()
             }_${
                now.getHours()
             }-${
                now.getMinutes()
             }.webm`;

            a.click();

            // メモリ解放
            URL.revokeObjectURL(url);
        };

        mediaRecorder.start();

        // 音声認識開始
        recognition.start();

        isRecording = true;

        statusDisplay.textContent = "録音中";

        startTimer();

    } catch (e) {

        console.error(e);

        alert("マイクが使用できません\n\n" +
              e.name + "\n" +
              e.message
        );

    }

});


// =========================
// 録音停止
// =========================

stopBtn.addEventListener("click", async () => {

    if (!isRecording) return;

    recognition.stop();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    if (mediaStream) {
      mediaStream
        .getTracks()
        .forEach(track => track.stop());

      mediaStream = null;
    }

    if (wakeLock) {

        await wakeLock.release();

        wakeLock = null;

    }

    isRecording = false;

    statusDisplay.textContent = "待機中";

    stopTimer();

    saveHistory();

});

// =========================
// 音声認識結果
// =========================

recognition.onresult = (event) => {

    console.log("event =", event);
    console.log("resultIndex =", event.resultIndex);
    console.log("results =", event.results);

    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {

        console.log("結果オブジェクト =", event.results[i]);
        console.log("候補0 =", event.results[i][0]);

        const transcript = event.results[i][0].transcript;

        console.log("transcript =", JSON.stringify(transcript));
        console.log("confidence =", event.results[i][0].confidence);
        console.log("isFinal =", event.results[i].isFinal);
        console.log("認識結果:",transcript);

        if (event.results[i].isFinal) {

            const now = new Date();

            const time = now.toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit"
            });

            finalTranscript += `[${time}] ` + addPunctuation(transcript) + "\n";

        } else {

            interimTranscript += transcript;

        }

    }

    result.value =
        finalTranscript +
        interimTranscript;

    updateStats();

};

// =========================
// 自動再開
// =========================

recognition.onend = () => {

    console.log("認識終了");

    if (isRecording) {
        try {
            console.log("再開します");
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    } else {
        statusDisplay.textContent = "待機中";
    }
};

// =========================
// 統計更新
// =========================

function updateStats() {

    count.textContent =
        result.value.length;

    const lines =
        result.value === ""
            ? 0
            : result.value.split("\n").length;

    lineCount.textContent =
        lines;

}

// =========================
// タイマー
// =========================

function startTimer() {

    clearInterval(timerInterval);

    timerInterval = setInterval(() => {

        seconds++;

        const h =
            String(
                Math.floor(seconds / 3600)
            ).padStart(2, "0");

        const m =
            String(
                Math.floor(
                    (seconds % 3600) / 60
                )
            ).padStart(2, "0");

        const s =
            String(
                seconds % 60
            ).padStart(2, "0");

        timerDisplay.textContent =
            `${h}:${m}:${s}`;

    }, 1000);

}

function stopTimer() {

    clearInterval(timerInterval);

}

function addPunctuation(text){

    return text
        .replace(/です$/g,"です。")
        .replace(/ます$/g,"ます。")
        .replace(/でした$/g,"でした。")
        .replace(/でしょう$/g,"でしょう。")
        .replace(/ください$/g,"ください。")
        .replace(/お願いします$/g,"お願いします。");

}

// =========================
// コピー
// =========================

function copyText() {

    navigator.clipboard
        .writeText(result.value)
        .then(() => {

            alert("コピーしました");

        });

}

// =========================
// 全消去
// =========================

function clearText() {

    if (!confirm("文字起こし内容を削除しますか？"))
        return;

    // 自動保存データ削除
    localStorage.removeItem("transcription");

    result.value = "";

    finalTranscript = "";

    summaryArea.textContent =
        "要約結果はここに表示されます。";

    updateStats();

}

// =========================
// TXT保存
// =========================

function saveTxt() {

    const now = new Date().toLocaleString();

const content =
`録音日時
${now}
------------------------
${result.value}`;

    const blob = new Blob(
        [content],
        {
            type: "text/plain"
        }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "文字起こし.txt";
    a.click();
    URL.revokeObjectURL(url);
}

// =========================
// Word保存
// =========================

function saveDoc() {

    const blob =
        new Blob(
            [result.value],
            {
                type:
                "application/msword"
            }
        );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "文字起こし.doc";
    a.click();
    URL.revokeObjectURL(a.href);
}

// =========================
// CSV保存
// =========================

function saveCsv() {
    const csv =
      `"日時","内容"\n` +
      `"${new Date().toLocaleString()}","${result.value.replace(/"/g,'""')}"`;

    const blob = new Blob(
      ['\uFEFF' + csv],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "文字起こし.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// =========================
// Wake Lock自動復帰
// =========================

document.addEventListener(
  "visibilitychange",
  async () => {
    if (
      wakeLock === null &&
      isRecording
    ) {
      await requestWakeLock();
    }
  }
);


// =========================
// 要約
// =========================

function createSummary() {

    const text =
        result.value
            .split("\n")
            .filter(
                line =>
                line.trim().length > 15
            );

    const summary =
        text.slice(0, 10);

    if (summary.length === 0) {

        summaryArea.textContent =
            "要約対象がありません。";

        return;

    }

    summaryArea.textContent =
        summary.join("\n");

}

// =========================
// ダークモード
// =========================

function toggleDarkMode() {

    document.body
        .classList
        .toggle("dark");

    localStorage.setItem(
        "darkMode",
        document.body.classList.contains("dark")
    );

}

// =========================
// 履歴保存
// =========================

function saveHistory() {

    if (
        result.value.trim() === ""
    ) return;

    let history =
        JSON.parse(
            localStorage.getItem("history")
        ) || [];

    history.unshift({

        date:
            new Date()
            .toLocaleString(),

        text:
            result.value

    });

    history =
        history.slice(0, 100);

    localStorage.setItem(
        "history",
        JSON.stringify(history)
    );

}

// =========================
// 履歴表示
// =========================

function showHistory() {

    const history =
        JSON.parse(
            localStorage.getItem("history")
        ) || [];

    let html = "";

    history.forEach(
        (item, index) => {

        html += `
        <div class="history-item">

            <div class="history-date">
                ${item.date}
            </div>

            <div>
                ${item.text.substring(0,100)}
            </div>

            <br>

            <button
                onclick="loadHistory(${index})">
                開く
            </button>

            <button
                class="history-delete"
                onclick="deleteHistory(${index})">
                削除
            </button>

        </div>
        `;
    });

    document.getElementById(
        "historyArea"
    ).innerHTML = html;

}

// =========================
// 履歴読込
// =========================

function loadHistory(index) {

    const history =
        JSON.parse(
            localStorage.getItem("history")
        ) || [];

    result.value =
        history[index].text;

    finalTranscript =
        history[index].text;

    summaryArea.textContent =
        "要約結果はここに表示されます。";

    updateStats();

}

// =========================
// 履歴削除
// =========================

function deleteHistory(index) {

    let history =
        JSON.parse(
            localStorage.getItem("history")
        ) || [];

    history.splice(index, 1);

    localStorage.setItem(
        "history",
        JSON.stringify(history)
    );

    showHistory();

}

// =========================
// 履歴検索
// =========================

function searchHistory() {

    const keyword =
        document
        .getElementById("search")
        .value
        .toLowerCase();

    const history =
        JSON.parse(
            localStorage.getItem("history")
        ) || [];

    const filtered =
        history.filter(item =>
            item.text
            .toLowerCase()
            .includes(keyword)
        );

    let html = "";

    filtered.forEach(item => {

        html += `
        <div class="history-item">

            <div class="history-date">
                ${item.date}
            </div>

            <div>
                ${item.text.substring(0,150)}
            </div>

        </div>
        `;

    });

    document.getElementById(
        "historyArea"
    ).innerHTML = html;

}

// =========================
// 自動保存
// =========================

setInterval(() => {

    localStorage.setItem(
        "transcription",
        result.value
    );

}, 5000);

// =========================
// 起動時復元
// =========================

window.addEventListener("load",() => {

    const saved = localStorage.getItem("transcription");

    if (saved) {

        result.value = saved;

        finalTranscript = saved;

    }

    const darkMode = localStorage.getItem("darkMode");

    if (darkMode === "true") {

        document.body
            .classList
            .add("dark");

    }
    updateStats();
    showHistory();
});
