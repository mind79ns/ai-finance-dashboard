#!/usr/bin/env node
// ===========================================
// 🤖 Codex AI Agent CLI
// 코딩 → 점검 → 테스트 → 빌드 → 배포 자동화
// ===========================================

import { execSync } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import OpenAI from "openai";

marked.setOptions({ renderer: new TerminalRenderer() });
const consoleLine = chalk.gray("──────────────────────────────");

// 🔧 환경설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 환경 변수로 API 키 등록 필요
});

async function askCodex(prompt) {
  console.log(chalk.cyan("\n💬 CODEx AI에게 요청 중...\n"));
  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  const output = res.choices[0].message.content;
  console.log(chalk.green("\n🤖 CODEx 응답\n"));
  console.log(marked(output));
  console.log(consoleLine);
  return output;
}

// 명령 실행 함수
function runCommand(cmd) {
  console.log(chalk.yellow(`\n⚙️ 실행: ${cmd}\n`));
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.log(chalk.red("❌ 오류 발생, 다음 단계로 진행"));
  }
}

// ===========================================
// 🧠 메인 플로우
// ===========================================
async function main() {
  console.log(chalk.bold.magenta("\n🚀 Codex AI Agent 시작\n"));

  // 1️⃣ 프로젝트 분석 및 계획 수립
  const plan = await askCodex(
    "이 Node.js 프로젝트를 점검, 테스트, 빌드, 배포하기 위한 단계별 계획을 만들어줘. 명령어는 npm 기준으로."
  );

  // 2️⃣ 실행 단계 선택
  const steps = [
    { name: "Lint 검사", value: "npm run lint" },
    { name: "테스트 실행", value: "npm test" },
    { name: "빌드 실행", value: "npm run build" },
    { name: "Netlify 배포", value: "netlify deploy --prod" },
  ];

  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message: "실행할 단계를 선택하세요:",
      choices: steps,
    },
  ]);

  // 3️⃣ 선택한 단계 자동 실행
  for (const cmd of selected) {
    runCommand(cmd);
  }

  // 4️⃣ Codex에게 결과 요약 요청
  await askCodex(
    "빌드와 배포 로그를 분석하고, 성공 여부와 개선점을 짧게 요약해줘."
  );

  console.log(chalk.bold.green("\n✅ 모든 과정 완료!\n"));
  console.log(consoleLine);
}

main();
