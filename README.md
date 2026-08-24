# study-tracker
学習記録アプリ

## 学習計画エージェント

教材のゴール、現在地、期限、勉強できる曜日・時間帯から学習計画を生成します。

- TOEICスコアなどの「成果指標」と、ページ・語・問題数などの「教材進捗」を分離
- 1つの目標へ複数教材を紐付け、残量・種類・対応分野・学習ペースから時間を配分
- ジャンルごとに教材を整理し、単語帳・文法書・公式問題集などの教材タイプを登録
- 成果目標では定期的に模試・確認テストを配置し、測定結果を次の再計画に利用
- 曜日・時間帯・1回の学習時間を守って予定を配置
- 期限から逆算し、教材の残りを各セッションへ分配
- 定期的な復習・遅れ吸収日の追加
- `.ics` 予定ファイルを読み込み、既存予定と重ならない時間を選択
- セッションの完了管理と、実績を反映した再計画
- Googleカレンダー等へ読み込める `.ics` ファイルの書き出し

すべての計画データと読み込んだ予定はブラウザの `localStorage` 内に保存されます。
既存教材はそのまま利用でき、新しい進捗項目が未設定の状態として読み込まれます。教材の編集画面から総量・現在地などを追加してください。

### AIバックエンド連携

GitHub PagesではAPIキーを安全に保持できないため、ブラウザからOpenAI APIを直接呼びません。`agent-config.js` の `window.STUDY_AGENT_ENDPOINT` に安全なサーバー側エンドポイントを設定すると、ローカルで作成した日時を維持したまま、コーチメッセージと各セッションの説明をAIで補助できます。

エンドポイントへ送る主な形式:

```json
{
  "goal": {
    "title": "基本情報技術者に合格する",
    "material": "合格教本",
    "description": "章末問題を8割解ける状態にする",
    "current": 120,
    "target": 500,
    "unit": "ページ",
    "deadline": "2026-10-31"
  },
  "draft": {
    "feasible": true,
    "predictedCompletion": "2026-10-28",
    "sessions": []
  }
}
```

期待するレスポンス:

```json
{
  "coachMessage": "最初の2週間は基礎理解を優先しましょう。",
  "sessions": [
    {
      "id": "2026-08-26-study-0",
      "title": "第3章の前半を読む",
      "detail": "例題1〜4を解き、最後に要点を3つ記録する"
    }
  ]
}
```

AI側は構造化されたJSONを返し、日時の衝突判定は常にローカルのスケジューラーを正とします。OpenAIを使う場合は[Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)のStructured Outputsを利用できます。

`worker/study-agent.js` はCloudflare WorkersなどのWeb標準API対応ランタイムで利用できるバックエンド例です。次のシークレット／環境変数をサーバー側へ設定します。

- `OPENAI_API_KEY`: OpenAI APIキー
- `OPENAI_MODEL`: 利用するモデルID
- `ALLOWED_ORIGIN`: `https://yassu0505.github.io` のような許可オリジン

デプロイ後、`agent-config.js` の `window.STUDY_AGENT_ENDPOINT` にWorkerのURLを設定します。APIキーをリポジトリへコミットしないでください。
公開エンドポイントには、ホスティング側のレート制限やボット対策も設定してください。

## テスト

```powershell
node --test tests/planner-core.test.js
```
