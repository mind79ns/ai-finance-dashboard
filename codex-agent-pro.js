// ===============================================
// 🚀 CODEX AGENT PRO — Full Auto Deploy Version
// Author: 찡이용 통합버전 (GPT-5 최적화)
// ===============================================

import fs from "fs";
import { execSync } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
import OpenAI from "openai";
import dotenv from "dotenv";

// ✅ .env 파일 자동 로드 (API Key 설정)
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -------------------- 기본 실행 함수 --------------------
async function runCommand(cmd, description) {
  console.log(chalk.cyan(`\n⚙️ ${description} 실행 중: ${cmd}\n`));

  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(chalk.green(`✅ ${description} 완료`));
    return null;
  } catch (err) {
    const stdout = err.stdout?.toString() || "";
    const stderr = err.stderr?.toString() || "";
    const combined = (stdout + "\n" + stderr).trim();
    console.log(chalk.red(`❌ ${description} 중 오류 또는 경고 발생`));

    if (combined.length > 10) return combined;
    else return "오류 로그를 수집하지 못했습니다.";
  }
}

// -------------------- Codex 분석 요청 --------------------
async function askCodexForFix(logs, context = "build") {
  console.log(chalk.yellow("\n🧠 Codex에 오류 로그 분석 요청 중...\n"));

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an AI software engineer that diagnoses CI/CD build and lint errors and provides detailed markdown-formatted fix suggestions.",
        },
        {
          role: "user",
          content: `다음은 ${context} 단계에서 발생한 오류 로그입니다. 이를 분석하여 수정 제안서를 작성해주세요:\n\n${logs}`,
        },
      ],
    });

    const suggestion = completion.choices[0].message.content;
    fs.writeFileSync("ai-fix.md", suggestion);
    console.log(chalk.green("\n💡 수정 제안이 ai-fix.md 파일로 저장되었습니다.\n"));
  } catch (error) {
    console.error("❌ Codex 요청 실패:", error);
  }
}

// -------------------- 메인 실행 절차 --------------------
async function main() {
  console.log(chalk.bold.magenta("🚀 Codex Agent Pro 시작\n"));

  // 단계 선택
  const { steps } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "steps",
      message: "✔ 실행할 단계를 선택하세요:",
      choices: [
        { name: "Lint 검사", value: "lint", checked: true },
        { name: "테스트 실행", value: "test", checked: true },
        { name: "빌드 실행", value: "build", checked: true },
        { name: "자동 커밋 & 배포", value: "deploy", checked: true },
      ],
    },
  ]);

  // 단계별 실행
  if (steps.includes("lint")) {
    const lintLog = await runCommand("npm run lint", "Lint 검사");
    if (lintLog) await askCodexForFix(lintLog, "lint");
  }

  if (steps.includes("test")) {
    const testLog = await runCommand("npm test", "테스트 실행");
    if (testLog) await askCodexForFix(testLog, "test");
  }

  if (steps.includes("build")) {
    const buildLog = await runCommand("npm run build", "빌드 실행");
    if (buildLog) await askCodexForFix(buildLog, "build");
  }

  if (steps.includes("deploy")) {
    console.log(chalk.blueBright("\n🚀 자동 커밋 및 Netlify 배포 시작...\n"));

    // Git 자동 푸시
    await runCommand(
      'git add . && git commit -m "auto deploy" && git push',
      "Git Auto Commit & Push"
    );

  }

  console.log(chalk.bold.green("\n✅ Codex Agent Pro 모든 단계 완료!"));
  console.log(chalk.gray("\n──────────────────────────────\n"));
}

main();

