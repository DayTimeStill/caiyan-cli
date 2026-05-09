#!/usr/bin/env node

import https from "https";

const args = process.argv.slice(2);
const AUTO_LIST = args.includes("--list") || args.includes("-l");

const BASE = "/api/v0/quiz/daily";
const HEADERS = {
  Referer: "https://xiaoce.fun/guessword",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

// ── API ──

function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/${path}${qs ? "?" + qs : ""}`;
  return new Promise((resolve, reject) => {
    https
      .get(`https://xiaoce.fun${url}`, { headers: HEADERS }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("JSON 解析失败"));
          }
        });
      })
      .on("error", reject);
  });
}

async function getToday() {
  const res = await apiGet("getDateV1");
  return res.data;
}

async function getStatus(date) {
  const res = await apiGet("getStatus", { type: "guess_word", date });
  return res.data.success;
}

async function guessWord(date, word) {
  return apiGet("GuessWord/guess", { date, word });
}

// ── 显示 ──

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[90m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  darkYellow: "\x1b[33m",
  red: "\x1b[91m",
};

function heatIcon(similarity) {
  if (similarity >= 90) return `${C.green}●${C.reset}`;
  if (similarity >= 70) return `${C.yellow}●${C.reset}`;
  if (similarity >= 50) return `${C.darkYellow}●${C.reset}`;
  if (similarity >= 30) return `${C.red}●${C.reset}`;
  return `${C.dim}●${C.reset}`;
}

function colorScore(score) {
  const s = `#${score}`;
  if (score <= 10) return `${C.green}${s}${C.reset}`;
  if (score <= 100) return `${C.yellow}${s}${C.reset}`;
  if (score <= 500) return `${C.darkYellow}${s}${C.reset}`;
  if (score <= 1000) return `${C.red}${s}${C.reset}`;
  return `${C.dim}${s}${C.reset}`;
}

function scoreBar(similarity) {
  const filled = Math.round((similarity / 100) * 15);
  const bar = "▰".repeat(filled) + "▱".repeat(15 - filled);
  if (similarity >= 90) return `${C.green}${bar}${C.reset}`;
  if (similarity >= 70) return `${C.yellow}${bar}${C.reset}`;
  if (similarity >= 50) return `${C.darkYellow}${bar}${C.reset}`;
  if (similarity >= 30) return `${C.red}${bar}${C.reset}`;
  return `${C.dim}${bar}${C.reset}`;
}

function showHistory(history) {
  if (!history.length) return;
  const correct = history.find((item) => item.correct);
  const guesses = history.filter((item) => !item.correct);
  const sorted = [...guesses].sort((a, b) => b.similarity - a.similarity);
  const line = `${C.dim}${"─".repeat(40)}${C.reset}`;
  console.log(`\n  ${line}`);
  if (correct) {
    const label = `答案：${correct.word}  共 ${history.length} 次`;
    const pad = Math.max(0, Math.floor((40 - label.length * 2) / 2));
    console.log(`  \x1b[30;42m${" ".repeat(pad)}${label}${" ".repeat(pad)}\x1b[0m`);
  } else {
    console.log(`  ${C.bold}记录${C.reset}  共 ${history.length} 次`);
  }
  console.log(`  ${line}`);
  for (const item of sorted.slice(0, 15)) {
    const icon = heatIcon(item.similarity);
    const pct = `${item.similarity.toFixed(2)}%`;
    const bar = scoreBar(item.similarity);
    console.log(`  ${icon} ${item.word.padEnd(8)} ${pct.padStart(8)}  ${bar}`);
  }
  if (sorted.length > 15) {
    console.log(`  ${C.dim}  ... 还有 ${sorted.length - 15} 条${C.reset}`);
  }
  console.log(`  ${line}`);
}

// ── 输入处理（支持中文删除）──

function charWidth(ch) {
  return ch.codePointAt(0) > 0x7f ? 2 : 1;
}

function readLine(prompt) {
  return new Promise((resolve, reject) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const chars = [];
    let buf = Buffer.alloc(0);

    function onData(chunk) {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length > 0) {
        const b = buf[0];

        // 回车
        if (b === 0x0d || b === 0x0a) {
          cleanup();
          process.stdout.write("\n");
          resolve(chars.join(""));
          return;
        }
        // Ctrl+C
        if (b === 0x03) {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("interrupted"));
          return;
        }
        // Ctrl+D
        if (b === 0x04) {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("eof"));
          return;
        }
        // 退格
        if (b === 0x7f || b === 0x08) {
          buf = buf.subarray(1);
          if (chars.length > 0) {
            const removed = chars.pop();
            const w = charWidth(removed);
            process.stdout.write("\b".repeat(w) + " ".repeat(w) + "\b".repeat(w));
          }
          continue;
        }
        // ESC 序列（方向键等），丢弃
        if (b === 0x1b) {
          const need = buf.length >= 3 ? 3 : buf.length;
          buf = buf.subarray(need);
          continue;
        }

        // 计算 UTF-8 字符长度
        let charLen = 1;
        if (b >= 0xf0) charLen = 4;
        else if (b >= 0xe0) charLen = 3;
        else if (b >= 0xc0) charLen = 2;

        if (buf.length < charLen) break; // 等更多字节

        const ch = buf.subarray(0, charLen).toString("utf8");
        buf = buf.subarray(charLen);
        chars.push(ch);
        process.stdout.write(ch);
      }
    }

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    }

    stdin.on("data", onData);
  });
}

// ── 主流程 ──

async function main() {
  let date, successCount;
  try {
    date = await getToday();
    successCount = await getStatus(date);
  } catch (e) {
    console.error(`  ${C.red}网络错误: ${e.message}${C.reset}`);
    process.exit(1);
  }

  const displayDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
  const line = `${C.dim}${"─".repeat(40)}${C.reset}`;

  console.log();
  console.log(`  ${C.bold}猜词${C.reset} · ${displayDate} · ${successCount} 人已解`);
  console.log(`  ${C.dim}输入词语回车猜测 · q 退出 · h 历史${AUTO_LIST ? " · 自动列表已开启" : ""}${C.reset}`);
  console.log(`  ${line}`);

  const history = [];
  let attempts = 0;

  while (true) {
    let word;
    try {
      word = (await readLine("  > ")).trim();
    } catch {
      console.log();
      break;
    }

    if (!word) continue;
    if (word === "q") break;
    if (word === "h") {
      showHistory(history);
      continue;
    }

    const dup = history.find((item) => item.word === word);
    if (dup) {
      const cs = colorScore(dup.score);
      console.log(`    ${C.dim}「${word}」已猜过  排名 ${cs}  相似度 ${dup.similarity.toFixed(2)}%${C.reset}`);
      continue;
    }

    let result;
    try {
      result = await guessWord(date, word);
    } catch (e) {
      console.log(`    ${C.red}网络错误: ${e.message}${C.reset}`);
      continue;
    }

    const score = result.score ?? -1;
    const similarity = (result.doubleScore ?? 0) * 100;
    const correct = result.correct ?? false;
    attempts++;

    history.push({ word, score, similarity, correct });

    if (correct) {
      showHistory(history);
      console.log();
      break;
    }

    if (score < 0 || similarity === 0) {
      console.log(`    ${C.dim}× 「${word}」不在语料库中${C.reset}`);
      history.pop();
      attempts--;
    } else {
      const icon = heatIcon(similarity);
      const bar = scoreBar(similarity);
      const rank = score < 1000 ? `  排名 ${colorScore(score)}` : "";
      console.log(`    ${icon} 相似度 ${similarity.toFixed(2)}%${rank}  ${bar}`);
      if (AUTO_LIST && history.length > 1) {
        showHistory(history);
      }
    }
  }
}

main();
