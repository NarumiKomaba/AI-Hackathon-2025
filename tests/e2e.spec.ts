import { test, expect } from '@playwright/test';

/**
 * クエストアプリ システムテスト
 * 
 * このテストスイートは「評議会ルーム（Council Room）」機能のE2Eフローを検証します。
 * プロジェクトのデータがダッシュボードからAI議論シミュレーションまで正しく流れていることを確認します。
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Quest App System Test', () => {
    test('Page Navigation and Council Room Functionality', async ({ page }) => {
        // 1. クエスト一覧のロード確認
        // ダッシュボードにクエストカードが正しくレンダリングされているかを確認します。
        console.log('Navigating to /quests...');
        await page.goto(`${BASE_URL}/quests`);

        const questCard = page.locator('div, section').filter({ hasText: '基幹システム刷新 編' }).first();
        await expect(questCard).toBeVisible({ timeout: 15000 });
        console.log('Quest list loaded successfully.');

        // 2. 評議会ページ（レポート画面）への直接遷移
        // 特定のクエストのレポートページにアクセスできるかを確認します。
        console.log('Navigating to council room...');
        await page.goto(`${BASE_URL}/quests/core-system/report`);

        // 議論開始前にステータスボード（主要メトリクス）が表示されているかを確認。
        await expect(page.locator('text=Project Status Board')).toBeVisible({ timeout: 15000 });
        console.log('Council room loaded successfully.');

        // 3. AI評議会の開始
        // マルチエージェントによる議論ロジックをキックします。
        console.log('Starting council meeting...');
        const startButton = page.locator('button:has-text("評議会を開始する")');
        await expect(startButton).toBeVisible();
        await startButton.click();

        // 4. AIマルチエージェントの応答待機
        // Gemini 2.5 Flash の 'thinkingBudget: 0' 設定により高速ですが、
        // 全エージェントの議論ループを考慮して最大60秒の待機枠を設定しています。
        console.log('Waiting for AI response...');
        await expect(page.locator('text=議論中...')).toBeVisible();

        // 少なくとも一人のエージェント（PMO, Sales, etc.）が発言したことを確認。
        const chatBubble = page.locator('.animate-fade-in-up').first();
        await expect(chatBubble).toBeVisible({ timeout: 60000 });
        console.log('AI responded successfully.');

        // 5. ユーザーの介入テスト（勇者の進言）
        // ユーザーがエージェントに対して追撃の質問を投稿できるかを確認します。
        console.log('Sending user message...');
        const input = page.locator('input[type="text"]');
        await input.fill('ドラ〇もん助けて！');
        await page.keyboard.press('Enter');

        // ユーザー（勇者）のメッセージがチャットUIにレンダリングされたかを確認。
        await expect(page.locator('text=勇者')).toBeVisible();
        await expect(page.locator('text=ドラ〇もん助けて！')).toBeVisible();
        console.log('User message sent successfully.');
    });

    test('Report Discussion and Action Plan Adoption', async ({ page }) => {
        console.log('Navigating to council room...');
        await page.goto(`${BASE_URL}/quests/core-system/report`);

        // 1. クエストデータのロードを待機
        console.log('Waiting for quest data to load...');
        await expect(page.locator('text=Project Status Board')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=基幹システム刷新 編')).toBeVisible({ timeout: 15000 });

        // 2. 報告書議論の開始
        console.log('Starting report discussion...');
        const discussReportButton = page.locator('button').filter({ hasText: '報告書を議論' });
        await expect(discussReportButton).toBeEnabled({ timeout: 15000 });
        await discussReportButton.click();

        // 3. ディスカッションログの生成を待機
        console.log('Waiting for report discussion logs...');
        const chatBubble = page.locator('.animate-fade-in-up').first();
        await expect(chatBubble).toBeVisible({ timeout: 60000 });

        // 想定Q&Aが表示されるのも確認
        console.log('Waiting for Assumed Q&A to appear...');
        await expect(page.locator('text=🧐 想定される鋭い質問')).toBeVisible({ timeout: 60000 });

        // 4. 案を採用する
        console.log('Testing "Adopt" functionality...');
        const adoptButton = page.locator('button').filter({ hasText: '👍 案を採用' }).first();
        await expect(adoptButton).toBeVisible();

        await adoptButton.click();
        console.log('Clicked Adopt button.');

        // 5. 左パネルの「採用されたアクション案」に反映されたか確認
        console.log('Verifying adopted action in status board...');
        const adoptedList = page.locator('ul.list-disc');
        await expect(adoptedList).toBeVisible();

        await expect(page.locator('text=✅ 採用済')).toBeVisible();

        const boardText = await adoptedList.innerText();
        expect(boardText.length).toBeGreaterThan(0);
        console.log('Adopted action verified in board.');
    });

    test('Member Summon and Conditional Approval Flow', async ({ page }) => {
        console.log('Navigating to council room...');
        await page.goto(`${BASE_URL}/quests/core-system/report`);

        // 1. クエストデータのロード待機
        await expect(page.locator('text=Project Status Board')).toBeVisible({ timeout: 15000 });

        // 2. 評議会を開始
        console.log('Starting council meeting...');
        const startButton = page.locator('button:has-text("評議会を開始する")');
        await expect(startButton).toBeVisible();
        await startButton.click();

        // 3. AI応答を待機
        const chatBubble = page.locator('.animate-fade-in-up').first();
        await expect(chatBubble).toBeVisible({ timeout: 60000 });
        console.log('AI responded.');

        // 4. メンバー指名機能のテスト（Summon Bar）
        console.log('Testing member summon feature...');
        const summonBar = page.locator('div').filter({ has: page.locator('button[title*="を指名"]') }).first();
        await expect(summonBar).toBeVisible();

        // SREを指名
        const sreButton = page.locator('button[title*="堅牢 基盤"]').first();
        await expect(sreButton).toBeVisible();
        await sreButton.click();

        // 指名状態（黄色枠）の確認
        await expect(sreButton).toHaveClass(/border-yellow-400/);
        console.log('SRE summoned successfully.');

        // 5. 指名したメンバーに質問を送信
        const input = page.locator('input[type="text"]');
        await input.fill('インフラコストを削減する方法は？');
        await page.keyboard.press('Enter');

        // SREの発言を待機
        await expect(page.locator('text=堅牢 基盤').or(page.locator('text=SRE'))).toBeVisible({ timeout: 60000 });
        console.log('SRE responded to summon.');

        // 6. 条件付き承認フローのテスト
        console.log('Testing conditional approval flow...');

        // アクション案の採用ボタンをクリック
        const adoptButton = page.locator('button').filter({ hasText: '👍 案を採用' }).first();
        await expect(adoptButton).toBeVisible();
        await adoptButton.click();

        // 条件付き承認モードの議論が開始されることを確認
        // 「条件」というキーワードを含む発言が出現するはず
        await expect(page.locator('text=/条件|前提|必要/')).toBeVisible({ timeout: 60000 });
        console.log('Conditional approval discussion started.');

        // ギルドマスターの総括を待機
        await expect(page.locator('text=/これらの条件|実行可能/')).toBeVisible({ timeout: 60000 });
        console.log('Guild Master summary appeared.');
    });
});
