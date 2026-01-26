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
});
