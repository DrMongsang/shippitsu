/**
 * 差分コピー（増分コピー）機能
 * A列の予約番号（ユニーク）を使って新規・更新分のみをコピー
 */

function copyIncrementalData() {
  // ==== 設定 ====
  const SOURCE_SPREADSHEET_ID = '1qfLWv1Hs0ys8_HxFAwDBiyTfgO7gJfIB6p3aOk7Vqes';
  const SOURCE_SHEET_NAME = 'DB_予約';
  const DEST_SPREADSHEET_ID = '18L7Pv605gE33CUHaDayG4FdDIMSBlV7dDpuGgcjDk8I';
  const DEST_SHEET_NAME = 'DB_予約';

  const RESERVATION_ID_COLUMN = 1; // A列（予約番号）
  const BATCH_SIZE = 1000; // 一度に読み込む行数
  const MAX_EXECUTION_TIME = 300000; // 5分
  const AUTO_RESUME = true;
  // ==============

  const startTime = Date.now();

  function checkExecutionTime() {
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_TIME) {
      throw new Error(`実行時間制限（${MAX_EXECUTION_TIME / 1000}秒）を超過しました。次回実行時に続きから再開します。`);
    }
  }

  try {
    Logger.log(`🚀 差分コピー処理を開始します`);
    Logger.log(`📊 コピー元: ${SOURCE_SPREADSHEET_ID} - ${SOURCE_SHEET_NAME}`);
    Logger.log(`📋 コピー先: ${DEST_SPREADSHEET_ID} - ${DEST_SHEET_NAME}`);

    // 1. スプレッドシートを開く
    const srcSs = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
    const srcSheet = srcSs.getSheetByName(SOURCE_SHEET_NAME);

    const destSs = SpreadsheetApp.openById(DEST_SPREADSHEET_ID);
    let destSheet = destSs.getSheetByName(DEST_SHEET_NAME);

    if (!destSheet) {
      Logger.log(`ℹ️ コピー先シート '${DEST_SHEET_NAME}' が存在しないため新規作成します`);
      destSheet = destSs.insertSheet(DEST_SHEET_NAME);
    }

    // 2. コピー元のデータ範囲を取得
    const srcLastRow = srcSheet.getLastRow();
    const srcLastCol = srcSheet.getLastColumn();
    Logger.log(`📊 コピー元データ: ${srcLastRow}行 × ${srcLastCol}列`);

    if (srcLastRow === 0) {
      Logger.log(`ℹ️ コピー元にデータがありません`);
      return;
    }

    // 3. コピー先の既存予約番号を取得（A列のみ）
    checkExecutionTime();
    const destLastRow = destSheet.getLastRow();
    Logger.log(`📊 コピー先データ: ${destLastRow}行`);

    const existingReservationIds = new Set();
    if (destLastRow > 0) {
      Logger.log(`🔍 コピー先の既存予約番号を読み込み中...`);
      const destReservationIds = destSheet.getRange(1, RESERVATION_ID_COLUMN, destLastRow, 1).getValues();

      for (let i = 0; i < destReservationIds.length; i++) {
        const resId = destReservationIds[i][0];
        if (resId !== '' && resId !== null && resId !== undefined) {
          existingReservationIds.add(String(resId));
        }
      }
      Logger.log(`✅ 既存予約番号: ${existingReservationIds.size}件`);
    }

    // 4. コピー元の予約番号を取得して差分を特定
    checkExecutionTime();
    Logger.log(`🔍 コピー元の予約番号を読み込み中...`);

    const srcReservationIds = srcSheet.getRange(1, RESERVATION_ID_COLUMN, srcLastRow, 1).getValues();
    const newRowsToAdd = [];
    const newReservationIds = [];

    for (let i = 0; i < srcReservationIds.length; i++) {
      const resId = srcReservationIds[i][0];
      const resIdStr = String(resId);

      // 予約番号が存在し、かつコピー先にない場合
      if (resId !== '' && resId !== null && resId !== undefined && !existingReservationIds.has(resIdStr)) {
        newRowsToAdd.push(i + 1); // 行番号（1-indexed）
        newReservationIds.push(resIdStr);
      }
    }

    Logger.log(`✅ 新規予約: ${newRowsToAdd.length}件`);

    if (newRowsToAdd.length === 0) {
      Logger.log(`ℹ️ コピーすべき新規データがありません`);
      Logger.log(`🎉 処理完了: 差分なし`);
      return;
    }

    // 5. 新規行をコピー
    Logger.log(`📋 ${newRowsToAdd.length}行の新規データをコピー中...`);

    const newDestStartRow = destLastRow + 1;
    let copiedCount = 0;

    // バッチでコピー
    for (let batchStart = 0; batchStart < newRowsToAdd.length; batchStart += BATCH_SIZE) {
      checkExecutionTime();

      const batchEnd = Math.min(batchStart + BATCH_SIZE, newRowsToAdd.length);
      const batchSize = batchEnd - batchStart;

      Logger.log(`🔄 バッチ ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(newRowsToAdd.length / BATCH_SIZE)}: ${batchSize}行を処理中...`);

      // このバッチの行データを取得
      const batchData = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const srcRowNum = newRowsToAdd[i];
        const rowData = srcSheet.getRange(srcRowNum, 1, 1, srcLastCol).getValues()[0];
        batchData.push(rowData);
      }

      // コピー先に書き込み
      const destRange = destSheet.getRange(newDestStartRow + copiedCount, 1, batchSize, srcLastCol);
      destRange.setValues(batchData);
      SpreadsheetApp.flush();

      copiedCount += batchSize;
      const progress = Math.round((copiedCount / newRowsToAdd.length) * 100);
      Logger.log(`📊 進捗: ${progress}% (${copiedCount}/${newRowsToAdd.length}行) 完了`);

      Utilities.sleep(500); // レート制限対策
    }

    const totalTime = (Date.now() - startTime) / 1000;
    Logger.log(`🎉 差分コピー完了: ${copiedCount}行の新規データを追加しました`);
    Logger.log(`📈 処理統計: 実行時間 ${totalTime.toFixed(2)}秒`);
    Logger.log(`   コピー元総数: ${srcLastRow}行`);
    Logger.log(`   コピー先既存: ${destLastRow}行`);
    Logger.log(`   新規追加: ${copiedCount}行`);
    Logger.log(`   コピー先合計: ${destLastRow + copiedCount}行`);

  } catch (e) {
    Logger.log(`💥 致命的エラーが発生しました`);
    Logger.log(`❌ エラーメッセージ: ${e.message}`);
    Logger.log(`📍 エラー発生箇所: ${e.stack || '(スタックトレースなし)'}`);

    // タイムアウトエラーの場合
    if (e.message && e.message.includes('実行時間制限')) {
      Logger.log(`⏱️ タイムアウトによる中断。`);

      if (AUTO_RESUME) {
        try {
          createResumeTimerForIncremental();
          Logger.log(`🔄 自動再開トリガーを作成しました（1分後に再開）`);
        } catch (triggerError) {
          Logger.log(`⚠️ 自動再開トリガーの作成に失敗: ${triggerError.message}`);
        }
      }
    }

    throw new Error(`差分コピー処理が失敗しました: ${e.message}`);
  }
}

/**
 * 差分コピー用の自動再開トリガーを作成
 */
function createResumeTimerForIncremental() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'copyIncrementalData') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // 1分後に実行するトリガーを作成
  ScriptApp.newTrigger('copyIncrementalData')
    .timeBased()
    .after(60 * 1000)
    .create();

  Logger.log('⏰ 差分コピー用自動再開トリガーを作成しました（60秒後に実行）');
}

/**
 * 更新検知して差分コピーを実行（推奨）
 */
function copyIfSourceUpdatedIncremental() {
  const SOURCE_SPREADSHEET_ID = '1qfLWv1Hs0ys8_HxFAwDBiyTfgO7gJfIB6p3aOk7Vqes';
  const SOURCE_SHEET_NAME = 'DB_予約';

  const now = new Date();
  Logger.log(`🔍 元データの更新確認を開始します [${now.toLocaleString()}]`);

  try {
    const props = PropertiesService.getScriptProperties();

    // スプレッドシートを開いてデータの「指紋」を取得
    const srcSs = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
    const srcSheet = srcSs.getSheetByName(SOURCE_SHEET_NAME);

    if (!srcSheet) {
      Logger.log(`❌ シート '${SOURCE_SHEET_NAME}' が見つかりません`);
      return;
    }

    const lastRow = srcSheet.getLastRow();
    const lastCol = srcSheet.getLastColumn();

    // データ指紋を作成
    let dataFingerprint = `${lastRow}:${lastCol}`;

    if (lastRow > 0 && lastCol > 0) {
      try {
        const sampleSize = Math.min(5, lastRow);
        const topSample = srcSheet.getRange(1, 1, sampleSize, Math.min(3, lastCol)).getValues();

        if (lastRow > 5) {
          const bottomStart = lastRow - 4;
          const bottomSample = srcSheet.getRange(bottomStart, 1, 5, Math.min(3, lastCol)).getValues();
          dataFingerprint += `:${JSON.stringify(topSample)}:${JSON.stringify(bottomSample)}`;
        } else {
          dataFingerprint += `:${JSON.stringify(topSample)}`;
        }
      } catch (sampleError) {
        Logger.log(`⚠️ サンプルデータ取得エラー: ${sampleError.message}`);
      }
    }

    const file = DriveApp.getFileById(SOURCE_SPREADSHEET_ID);
    const fileUpdated = file.getLastUpdated();
    dataFingerprint += `:${fileUpdated.getTime()}`;

    const lastFingerprint = props.getProperty('LAST_DATA_FINGERPRINT_INCREMENTAL');

    Logger.log(`📊 データ情報: ${lastRow}行 × ${lastCol}列`);
    Logger.log(`🕒 ファイル最終更新: ${fileUpdated.toLocaleString()}`);

    if (lastFingerprint === dataFingerprint) {
      Logger.log('ℹ️ 元データに変更なし。コピーをスキップします');
      return;
    }

    Logger.log('🔄 元データの更新を検知しました');
    if (lastFingerprint) {
      Logger.log(`   前回の指紋: ${lastFingerprint.substring(0, 100)}...`);
      Logger.log(`   今回の指紋: ${dataFingerprint.substring(0, 100)}...`);
    } else {
      Logger.log('   (初回実行のため前回データなし)');
    }

    // 差分コピー実行
    Logger.log('📋 差分データコピーを開始します');
    copyIncrementalData();

    // 成功したら指紋を保存
    props.setProperty('LAST_DATA_FINGERPRINT_INCREMENTAL', dataFingerprint);
    props.setProperty('LAST_SRC_UPDATED_INCREMENTAL', new Date().toISOString());
    Logger.log('✅ 元データの更新を検知し、差分コピーを完了しました');

  } catch (error) {
    Logger.log(`❌ copyIfSourceUpdatedIncremental でエラーが発生: ${error.message}`);
    Logger.log(`📍 スタック: ${error.stack || '(スタックトレースなし)'}`);
  }
}
