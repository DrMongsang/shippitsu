/**
 * IMPORT RANGEの代替スクリプト (A列B列を下からチェックして最終行を特定する高速版)
 * ★安定性向上版 - リトライ機能・詳細エラーハンドリング・レート制限対応
 * 改善版: タイムアウト対策・ロック処理の修正・レート制限の強化
 */

function copyVisitDataToMySheet_Stable() {
  // ==== 設定 ====
  const SOURCE_SPREADSHEET_ID = '1qfLWv1Hs0ys8_HxFAwDBiyTfgO7gJfIB6p3aOk7Vqes'; // コピー元のスプレッドシートID
  const SOURCE_SHEET_NAME = 'DB_予約'; // コピー元のシート名
  const DEST_SPREADSHEET_ID = '18L7Pv605gE33CUHaDayG4FdDIMSBlV7dDpuGgcjDk8I'; // コピー先のスプレッドシートID
  const DEST_SHEET_NAME = 'DB_予約'; // コピー先のシート名

  const CHUNK_SIZE = 300; // 一度に運ぶ行数（安定性のためさらに小さく設定）
  const MAX_RETRIES = 3; // 最大リトライ回数
  const BASE_DELAY = 1500; // 基本待機時間（ミリ秒）
  const OPERATION_DELAY = 500; // 操作間の待機時間（ミリ秒）
  const MAX_EXECUTION_TIME = 300000; // 最大実行時間 5分（GASの6分制限を考慮）
  // ==============

  // ロック変数をtryブロックの外で定義（finallyでアクセス可能にする）
  let lock = null;
  const startTime = Date.now();

  /**
   * 実行時間制限チェック
   */
  function checkExecutionTime() {
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_TIME) {
      throw new Error(`実行時間制限（${MAX_EXECUTION_TIME / 1000}秒）を超過しました。次回実行時に続きから再開します。`);
    }
  }

  /**
   * リトライ機能付きの安全な実行関数
   */
  function executeWithRetry(operation, operationName, maxRetries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        checkExecutionTime(); // タイムアウトチェック
        Logger.log(`🔄 ${operationName} - 試行 ${attempt}/${maxRetries}`);
        const result = operation();
        Logger.log(`✅ ${operationName} - 成功`);
        return result;
      } catch (error) {
        // タイムアウトエラーは即座に再スロー
        if (error.message && error.message.includes('実行時間制限')) {
          throw error;
        }

        Logger.log(`⚠️ ${operationName} - 試行 ${attempt} 失敗: ${error.message}`);

        if (attempt === maxRetries) {
          Logger.log(`❌ ${operationName} - 最大試行回数に達しました`);
          throw new Error(`${operationName}が${maxRetries}回の試行後も失敗: ${error.message}`);
        }

        // 指数バックオフで待機時間を増加
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        Logger.log(`⏳ ${delay}ms 待機してリトライします...`);
        Utilities.sleep(delay);
      }
    }
  }

  /**
   * 安全なスプレッドシート操作（レート制限対策の待機付き）
   */
  function safeSpreadsheetOperation(operation, description) {
    const result = executeWithRetry(operation, description);
    // レート制限対策: 各操作後に短い待機時間を設ける
    Utilities.sleep(OPERATION_DELAY);
    return result;
  }

  try {
    Logger.log(`🚀 データコピー処理を開始します`);
    Logger.log(`📊 コピー元: ${SOURCE_SPREADSHEET_ID} - ${SOURCE_SHEET_NAME}`);
    Logger.log(`📋 コピー先: ${DEST_SPREADSHEET_ID} - ${DEST_SHEET_NAME}`);

    // 1. コピー元シートの準備（リトライ機能付き）
    const srcSs = safeSpreadsheetOperation(
      () => SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID),
      'コピー元スプレッドシートのオープン'
    );

    const srcSheet = safeSpreadsheetOperation(
      () => {
        const sheet = srcSs.getSheetByName(SOURCE_SHEET_NAME);
        if (!sheet) {
          throw new Error(`シート '${SOURCE_SHEET_NAME}' が見つかりません`);
        }
        return sheet;
      },
      'コピー元シートの取得'
    );

    // 2. コピー先シートの準備（リトライ機能付き）
    const destSs = safeSpreadsheetOperation(
      () => SpreadsheetApp.openById(DEST_SPREADSHEET_ID),
      'コピー先スプレッドシートのオープン'
    );

    let destSheet = safeSpreadsheetOperation(
      () => {
        let sheet = destSs.getSheetByName(DEST_SHEET_NAME);
        if (!sheet) {
          Logger.log(`ℹ️ コピー先シート '${DEST_SHEET_NAME}' が存在しないため新規作成します`);
          sheet = destSs.insertSheet(DEST_SHEET_NAME);
        }
        return sheet;
      },
      'コピー先シートの準備'
    );

    // 3. コピー元の「本当の最終行」を探す（リトライ機能付き）
    Logger.log("🔍 A列とB列を下からチェックして、実際のデータ最終行を特定中...");

    const { lastRowWithData, colCount } = safeSpreadsheetOperation(
      () => {
        const maxRows = srcSheet.getMaxRows();
        Logger.log(`📏 シートの最大行数: ${maxRows}`);

        // バッチで読み込んでメモリ使用量を削減
        const BATCH_SIZE = 1000;
        let lastRow = 0;

        for (let batchStart = maxRows; batchStart > 0; batchStart -= BATCH_SIZE) {
          const actualStart = Math.max(1, batchStart - BATCH_SIZE + 1);
          const actualSize = batchStart - actualStart + 1;

          const values = srcSheet.getRange(actualStart, 1, actualSize, 2).getValues();

          for (let i = values.length - 1; i >= 0; i--) {
            if (values[i][0] !== '' || values[i][1] !== '') {
              lastRow = actualStart + i;
              break;
            }
          }

          if (lastRow > 0) break;
        }

        const lastCol = srcSheet.getLastColumn();
        Logger.log(`📊 実際のデータ最終行: ${lastRow}行 × ${lastCol}列`);

        return { lastRowWithData: lastRow, colCount: lastCol };
      },
      'データ範囲の特定'
    );

    // 4. データが空の場合の処理
    if (lastRowWithData === 0) {
      Logger.log(`ℹ️ A列・B列にデータが見つかりませんでした。コピー先をクリアして処理を終了します。`);

      safeSpreadsheetOperation(
        () => {
          destSheet.clearContents();
          return true;
        },
        'コピー先シートのクリア'
      );

      Logger.log(`✅ 処理完了: データなしのためクリアのみ実行`);
      return;
    }

    // 5. 同時実行防止ロックの取得
    lock = LockService.getScriptLock();
    try {
      if (!lock.tryLock(30000)) { // 30秒まで待機して取得を試みる
        Logger.log('🔒 他の実行が進行中のため、今回の実行をスキップします');
        return;
      }
    } catch (lockError) {
      Logger.log(`⚠️ ロック取得エラー: ${lockError.message}`);
      throw new Error(`ロック取得に失敗しました: ${lockError.message}`);
    }

    // 6. チェックポイントによる再開機能の準備
    const props = PropertiesService.getScriptProperties();
    const sourceFP = `${SOURCE_SPREADSHEET_ID}:${SOURCE_SHEET_NAME}:${lastRowWithData}:${colCount}`;
    let offset = parseInt(props.getProperty('COPY_OFFSET') || '0', 10);
    let runId = props.getProperty('COPY_RUN_ID');
    const prevFP = props.getProperty('COPY_SOURCE_FP');

    // 新規実行またはソース構成が変わった場合は最初からやり直し
    if (!runId || prevFP !== sourceFP || offset >= lastRowWithData) {
      runId = `${Date.now()}`;
      offset = 0;
      props.setProperty('COPY_RUN_ID', runId);
      props.setProperty('COPY_SOURCE_FP', sourceFP);
      props.setProperty('COPY_OFFSET', String(offset));

      // 新規実行時のみクリア（途中停止時に消しっぱなしにならないよう配慮）
      safeSpreadsheetOperation(
        () => {
          destSheet.clearContents();
          return true;
        },
        'コピー先シートのクリア'
      );
      Logger.log(`🧹 初期化: コピー先シートをクリアしました（runId=${runId}）`);
    } else {
      Logger.log(`⏭️ 再開モード: 前回の続きから実行します offset=${offset}/${lastRowWithData}（runId=${runId}）`);
    }

    // 7. 転送処理（分割コピー・逐次取得＆書き込み・リトライ機能付き）
    Logger.log(`🚀 データ転送開始: ${lastRowWithData}行 × ${colCount}列 を ${CHUNK_SIZE}行ずつ安全に転送します`);

    let totalProcessed = offset;
    const totalChunks = Math.ceil(lastRowWithData / CHUNK_SIZE);

    for (let start = offset + 1; start <= lastRowWithData; start += CHUNK_SIZE) {
      checkExecutionTime(); // チャンクごとにタイムアウトチェック

      const chunkIndex = Math.floor((start - 1) / CHUNK_SIZE) + 1;
      const chunkSize = Math.min(CHUNK_SIZE, lastRowWithData - start + 1);

      // ソースからチャンクを取得（レート制限対策の待機付き）
      const chunk = safeSpreadsheetOperation(
        () => srcSheet.getRange(start, 1, chunkSize, colCount).getValues(),
        `チャンク ${chunkIndex}/${totalChunks} (${start}～${start + chunkSize - 1}行目) の取得`
      );

      // 取得と書き込みの間に追加の待機時間を設ける
      Utilities.sleep(OPERATION_DELAY);

      // コピー先へチャンクを書き込み（レート制限対策の待機付き）
      safeSpreadsheetOperation(
        () => {
          const targetRange = destSheet.getRange(start, 1, chunkSize, colCount);
          targetRange.setValues(chunk);
          return true;
        },
        `チャンク ${chunkIndex}/${totalChunks} (${start}～${start + chunkSize - 1}行目) の書き込み`
      );

      // チェックポイント更新
      totalProcessed += chunkSize;
      props.setProperty('COPY_OFFSET', String(start + chunkSize - 1));
      const progress = Math.round((totalProcessed / lastRowWithData) * 100);
      Logger.log(`📊 進捗: ${progress}% (${totalProcessed}/${lastRowWithData}行) 完了`);

      // レート制限対策の待機（最後のチャンク以外）
      if (start + CHUNK_SIZE <= lastRowWithData) {
        Utilities.sleep(BASE_DELAY);
      }
    }

    // 完了時はチェックポイントをクリア
    props.deleteProperty('COPY_RUN_ID');
    props.deleteProperty('COPY_SOURCE_FP');
    props.deleteProperty('COPY_OFFSET');

    const totalTime = (Date.now() - startTime) / 1000;
    Logger.log(`🎉 データコピー完了: ${lastRowWithData}行 × ${colCount}列 を正常に転送しました`);
    Logger.log(`📈 処理統計: ${totalChunks}チャンクに分割して実行（実行時間: ${totalTime.toFixed(2)}秒）`);

  } catch (e) {
    // 詳細なエラー情報をログに記録
    Logger.log(`💥 致命的エラーが発生しました`);
    Logger.log(`❌ エラーメッセージ: ${e.message}`);
    Logger.log(`📍 エラー発生箇所: ${e.stack || '(スタックトレースなし)'}`);
    Logger.log(`🔧 対処法: スプレッドシートの権限、ネットワーク接続、API制限を確認してください`);

    // タイムアウトエラーの場合は次回再開可能な旨を通知
    if (e.message && e.message.includes('実行時間制限')) {
      Logger.log(`⏱️ タイムアウトによる中断。次回実行時に続きから再開されます。`);
    }

    // エラーを再スローして呼び出し元にも通知
    throw new Error(`データコピー処理が失敗しました: ${e.message}`);
  } finally {
    // ロック解放（取得済みの場合のみ）
    if (lock !== null) {
      try {
        lock.releaseLock();
        Logger.log('🔓 ロックを解除しました');
      } catch (releaseErr) {
        Logger.log(`⚠️ ロック解除時にエラー: ${releaseErr.message}`);
      }
    }
  }
}

/**
 * スプレッドシートの接続性とアクセス権限をチェックする
 */
function healthCheck() {
  const SOURCE_SPREADSHEET_ID = '1qfLWv1Hs0ys8_HxFAwDBiyTfgO7gJfIB6p3aOk7Vqes';
  const DEST_SPREADSHEET_ID = '18L7Pv605gE33CUHaDayG4FdDIMSBlV7dDpuGgcjDk8I';

  Logger.log(`🏥 ヘルスチェック開始`);

  try {
    // コピー元スプレッドシートのチェック
    const srcSs = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
    const srcSheet = srcSs.getSheetByName('DB_予約');
    Logger.log(`✅ コピー元スプレッドシート: アクセス可能`);

    if (srcSheet) {
      const dataCount = srcSheet.getLastRow();
      Logger.log(`📊 コピー元データ行数: ${dataCount}行`);
    } else {
      Logger.log(`⚠️ コピー元シート 'DB_予約' が見つかりません`);
      return false;
    }

    // コピー先スプレッドシートのチェック
    const destSs = SpreadsheetApp.openById(DEST_SPREADSHEET_ID);
    Logger.log(`✅ コピー先スプレッドシート: アクセス可能`);

    // 書き込み権限のテスト
    const testSheet = destSs.getSheetByName('DB_予約') || destSs.insertSheet('DB_予約');
    testSheet.getRange('A1').setValue('ヘルスチェック');
    Utilities.sleep(500); // 書き込み確認のための待機
    const testValue = testSheet.getRange('A1').getValue();

    if (testValue !== 'ヘルスチェック') {
      Logger.log(`❌ 書き込み検証失敗: 期待値と異なる値が読み取られました`);
      return false;
    }

    testSheet.getRange('A1').clearContent();
    Logger.log(`✅ 書き込み権限: 正常`);

    Logger.log(`🎉 ヘルスチェック完了: すべて正常です`);
    return true;

  } catch (error) {
    Logger.log(`❌ ヘルスチェック失敗: ${error.message}`);
    Logger.log(`📍 エラー詳細: ${error.stack || '(スタックトレースなし)'}`);
    return false;
  }
}

/**
 * パフォーマンス測定付きでデータコピーを実行する
 */
function copyWithPerformanceMonitoring() {
  const startTime = new Date();
  Logger.log(`⏱️ パフォーマンス測定開始: ${startTime.toLocaleString()}`);

  try {
    // ヘルスチェック実行
    if (!healthCheck()) {
      throw new Error('ヘルスチェックに失敗しました。接続を確認してください。');
    }

    Logger.log(`⏳ メインコピー処理を開始します...`);
    Utilities.sleep(1000); // ヘルスチェック後の待機

    // メインのコピー処理実行
    copyVisitDataToMySheet_Stable();

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    Logger.log(`⏱️ パフォーマンス測定結果:`);
    Logger.log(`   開始時刻: ${startTime.toLocaleString()}`);
    Logger.log(`   終了時刻: ${endTime.toLocaleString()}`);
    Logger.log(`   実行時間: ${duration.toFixed(2)}秒`);
    Logger.log(`🚀 処理が正常に完了しました`);

  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    Logger.log(`💥 処理中にエラーが発生しました (実行時間: ${duration.toFixed(2)}秒)`);
    Logger.log(`❌ エラー: ${error.message}`);
    Logger.log(`📍 スタック: ${error.stack || '(スタックトレースなし)'}`);
    throw error;
  }
}

/**
 * 元データの更新を検知したらコピーを実行する（11:30以降のみ）
 * これを時間主導トリガー（例: 15分おき/30分おき）に設定すると、更新があったタイミングで一度だけ走る
 */
function copyIfSourceUpdated() {
  const SOURCE_SPREADSHEET_ID = '1qfLWv1Hs0ys8_HxFAwDBiyTfgO7gJfIB6p3aOk7Vqes';

  const now = new Date();
  const isAfter1130 = (now.getHours() > 11) || (now.getHours() === 11 && now.getMinutes() >= 30);
  if (!isAfter1130) {
    Logger.log('⏳ 11:30以降に実行する想定のため、今回はスキップします');
    return;
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const file = DriveApp.getFileById(SOURCE_SPREADSHEET_ID);
    const updated = file.getLastUpdated();
    const lastProcessedIso = props.getProperty('LAST_SRC_UPDATED');
    const lastProcessed = lastProcessedIso ? new Date(lastProcessedIso) : null;

    Logger.log(`🕒 元データの更新時刻: ${updated.toLocaleString()}`);
    if (lastProcessed) {
      Logger.log(`🕒 前回処理時刻: ${lastProcessed.toLocaleString()}`);
    }

    if (lastProcessed && lastProcessed.getTime() >= updated.getTime()) {
      Logger.log('ℹ️ 元データに変更なし。コピーをスキップします');
      return;
    }

    // 更新あり → コピー実行
    Logger.log('🔄 元データの更新を検知。コピーを開始します');
    copyVisitDataToMySheet_Stable();

    // 更新時刻を保存（次回以降の不要実行を防止）
    props.setProperty('LAST_SRC_UPDATED', updated.toISOString());
    Logger.log('✅ 元データの更新を検知し、コピーを完了しました');

  } catch (error) {
    Logger.log(`❌ copyIfSourceUpdated でエラーが発生: ${error.message}`);
    // エラー時も次回実行できるよう、再スローしない
  }
}

/**
 * 旧バージョンとの互換性のため、元の関数名でも呼び出せるようにする
 */
function copyVisitDataToMySheet_Fixed() {
  Logger.log(`ℹ️ 旧関数名での呼び出しを検出。新しい安定版関数を実行します。`);
  return copyVisitDataToMySheet_Stable();
}

/**
 * チェックポイントをリセットする（デバッグ用）
 * 途中停止状態から強制的に最初からやり直したい場合に実行
 */
function resetCheckpoint() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('COPY_RUN_ID');
  props.deleteProperty('COPY_SOURCE_FP');
  props.deleteProperty('COPY_OFFSET');
  props.deleteProperty('LAST_SRC_UPDATED');
  Logger.log('🔄 すべてのチェックポイントをリセットしました');
}
