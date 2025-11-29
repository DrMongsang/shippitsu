# -*- coding: utf-8 -*-
"""
SHARINGAN ENGINE - GitHub Actions自動実行版 来店件数予測システム

このスクリプトは以下の機能を統合しています：
1. スプレッドシートデータ抽出
2. データ抽出・整形・特徴量エンジニアリング
3. LightGBM機械学習モデル
4. 天気データ統合（Open-Meteo API）
5. 高精度予測システム
6. スプレッドシートに出力(2Wと2M)

認証方式：サービスアカウント（自動実行対応）
"""

# ==========================================
# 必要ライブラリのインストールと読み込み
# ==========================================
import subprocess
import sys
import os
import json

def install_packages():
    """必要なパッケージをインストール"""
    packages = [
        'jpholiday', 'pandas', 'numpy',
        'scikit-learn', 'matplotlib', 'seaborn',
        'tqdm', 'requests', 'gspread', 'gspread_dataframe',
        'lightgbm', 'google-auth', 'google-auth-oauthlib', 'google-auth-httplib2'
    ]

    for package in packages:
        try:
            __import__(package)
        except ImportError:
            print(f"📦 Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--quiet"])

# パッケージインストール実行
install_packages()

# ライブラリ読み込み
import pandas as pd
import numpy as np
try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except (ImportError, FileNotFoundError, OSError) as e:
    print(f"⚠️ LightGBMが利用できません ({e})。代替モデルを使用します。")
    from sklearn.ensemble import RandomForestRegressor
    LIGHTGBM_AVAILABLE = False
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib
matplotlib.use('Agg')  # バックエンドをAggに設定（GUI不要）
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import jpholiday
import requests
import warnings
from tqdm import tqdm
import io

warnings.filterwarnings('ignore')

# Simple font setup for English graphs
def setup_font():
    """Setup standard fonts for English graphs"""
    try:
        print("🔧 Setting up standard fonts for English graphs...")

        # Use standard fonts that work everywhere
        plt.rcParams['font.family'] = ['DejaVu Sans', 'Arial', 'sans-serif']
        plt.rcParams['axes.unicode_minus'] = False
        plt.rcParams['figure.figsize'] = (12, 8)
        plt.rcParams['font.size'] = 12
        plt.rcParams['axes.labelsize'] = 12
        plt.rcParams['xtick.labelsize'] = 10
        plt.rcParams['ytick.labelsize'] = 10
        plt.rcParams['legend.fontsize'] = 10
        plt.rcParams['figure.titlesize'] = 14
        plt.rcParams['axes.titlesize'] = 12

        # seaborn settings
        sns.set_style("whitegrid")
        sns.set_context("notebook", font_scale=1.1)

        print("✅ Font setup completed for English graphs")
        return True

    except Exception as e:
        print(f"⚠️ Font setup error: {e}")
        return False

# フォント設定を実行
setup_font()

# Google認証ライブラリ
import gspread
from google.oauth2.service_account import Credentials
from gspread_dataframe import set_with_dataframe

print("=" * 80)
print("🔮 SHARINGAN ENGINE - GitHub Actions自動実行版 来店件数予測システム")
print("=" * 80)

# ==========================================
# スプレッドシート設定
# ==========================================
SPREADSHEET_ID = "18L7Pv605gE33CUHaDayG4FdDIMSBlV7dDpuGgcjDk8I"
INPUT_SHEET_NAME = "DB_予約"
OUTPUT_SHEET_1W = "未来_2W"
OUTPUT_SHEET_1M = "未来_2M"

# 予約データ用スプレッドシート設定
RESERVATION_SPREADSHEET_ID = "1aIgHCT88h4dmmGTFcdpl5-BydqblXt0PNg0_UM_IQKU"
RESERVATION_SHEETS = {
    "sheet1": "シート1",  # 今日以降の予約状況
    "sheet2": "シート2",  # 今日以降の予約完了（キャンセル含む）
    "sheet5": "シート5"   # 今日以降の予約完了（キャンセル抜き）
}

# ==========================================
# STEP 1: スプレッドシート認証とデータ取得
# ==========================================
def setup_spreadsheet_connection():
    """サービスアカウントでスプレッドシート接続を設定"""
    print("\n🔐 サービスアカウント認証を開始します...")

    try:
        # 環境変数からサービスアカウントのJSONを取得
        credentials_json = os.environ.get('GOOGLE_CREDENTIALS')

        if not credentials_json:
            print("❌ 環境変数 GOOGLE_CREDENTIALS が設定されていません")
            return None

        # JSONをパース
        credentials_dict = json.loads(credentials_json)

        # スコープ設定
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]

        # 認証情報作成
        creds = Credentials.from_service_account_info(credentials_dict, scopes=scopes)
        gc = gspread.authorize(creds)

        print("✅ サービスアカウント認証完了")
        return gc

    except Exception as e:
        print(f"❌ 認証エラー: {e}")
        return None

def load_reservation_data_from_spreadsheet(gc):
    """予約データスプレッドシートからデータを読み込み"""
    print("\n📊 予約データスプレッドシートからデータを読み込み中...")

    reservation_data = {}

    try:
        # 予約データスプレッドシートを開く
        reservation_sheet = gc.open_by_key(RESERVATION_SPREADSHEET_ID)

        for sheet_key, sheet_name in RESERVATION_SHEETS.items():
            try:
                print(f"📋 {sheet_name} シートを読み込み中...")
                worksheet = reservation_sheet.worksheet(sheet_name)

                # データを取得
                data = worksheet.get_all_records()
                if data:
                    df = pd.DataFrame(data)
                    # データ型の検証と修正
                    df = _validate_and_clean_reservation_data(df, sheet_key)
                    reservation_data[sheet_key] = df
                    print(f"✅ {sheet_name}: {len(df)}件のデータを読み込み")
                else:
                    print(f"⚠️ {sheet_name}: データが見つかりません")
                    reservation_data[sheet_key] = pd.DataFrame()

            except Exception as e:
                print(f"❌ {sheet_name} の読み込みに失敗: {e}")
                reservation_data[sheet_key] = pd.DataFrame()

        return reservation_data

    except Exception as e:
        print(f"❌ 予約データスプレッドシートの接続に失敗: {e}")
        return {key: pd.DataFrame() for key in RESERVATION_SHEETS.keys()}

def _validate_and_clean_reservation_data(df, sheet_key):
    """予約データの検証とクリーニング"""
    try:
        # 空の行を削除
        df = df.dropna(how='all')

        # 日付列の検証
        date_columns = ['日付', 'date', '予約日', '来店日']
        date_col_found = None

        for col in date_columns:
            if col in df.columns:
                date_col_found = col
                break

        if date_col_found:
            # 日付の形式を統一
            try:
                df[date_col_found] = pd.to_datetime(df[date_col_found], errors='coerce')
                # 無効な日付を持つ行を削除
                df = df.dropna(subset=[date_col_found])
            except Exception as e:
                print(f"    ⚠️ {sheet_key}の日付列処理でエラー: {e}")

        return df

    except Exception as e:
        print(f"    ❌ {sheet_key}のデータクリーニングでエラー: {e}")
        return df

def load_data_from_spreadsheet(gc):
    """スプレッドシートからデータを読み込み"""
    if gc is None:
        return None

    try:
        print(f"\n📊 スプレッドシートからデータを読み込み中...")
        print(f"📋 スプレッドシートID: {SPREADSHEET_ID}")
        print(f"📄 シート名: {INPUT_SHEET_NAME}")

        ws = gc.open_by_key(SPREADSHEET_ID).worksheet(INPUT_SHEET_NAME)
        data = ws.get_all_values()

        if len(data) < 2:
            print("❌ データが不足しています")
            return None

        df = pd.DataFrame(data[1:], columns=data[0])
        print(f"✅ データ読み込み完了: {df.shape[0]}件, {df.shape[1]}列")
        return df

    except Exception as e:
        print(f"❌ スプレッドシート読み込みエラー: {e}")
        return None

# ==========================================
# STEP 2: データクリーニング・前処理クラス
# ==========================================
class DataProcessor:
    """データ処理・前処理を行うクラス"""

    def __init__(self):
        self.data = None
        self.daily_data = None

    def deduplicate_columns(self, columns):
        """重複列名を処理"""
        seen = {}
        new_cols = []
        for col in columns:
            if col in seen:
                seen[col] += 1
                new_cols.append(f"{col}_{seen[col]}")
            else:
                seen[col] = 0
                new_cols.append(col)
        return new_cols

    def load_and_clean_data(self, data=None):
        """データ読み込みとクリーニング"""
        print("\n📊 Step 2: データ読み込み・クリーニング中...")

        # データ読み込み
        if data is not None:
            self.data = data
        else:
            print("❌ データが提供されていません")
            return None

        print(f"✅ データ読み込み完了: {self.data.shape[0]}件, {self.data.shape[1]}列")

        # 重複列名処理
        self.data.columns = self.deduplicate_columns(self.data.columns)

        # 基本的な型変換
        if "予約番号" in self.data.columns:
            self.data["予約番号"] = pd.to_numeric(self.data["予約番号"], errors="coerce").astype("Int64")

        if "所要時間" in self.data.columns:
            self.data["所要時間"] = pd.to_numeric(self.data["所要時間"], errors="coerce").fillna(0).astype(int)

        # 日付整形
        if "予約日" in self.data.columns:
            self.data["予約日"] = pd.to_datetime(self.data["予約日"], errors="coerce")
            self.data["予約日"] = self.data["予約日"].dt.strftime("%Y-%m-%d")

        # 店舗補完
        if "店舗" in self.data.columns:
            self.data["店舗"] = self.data["店舗"].replace("", pd.NA)
            self.data["店舗"] = self.data["店舗"].fillna("新宿WOMEN'S")

        print("✅ データクリーニング完了")
        return self.data

    def aggregate_daily_data(self):
        """日次データ集計"""
        print("\n📈 Step 3: 日次データ集計中...")

        # キャンセルフラグ
        cancel_cols = [c for c in self.data.columns if "予約キャンセル日時" in str(c)]
        self.data["キャンセルフラグ"] = 0
        if len(cancel_cols) > 0:
            self.data["キャンセルフラグ"] = self.data[cancel_cols].apply(
                lambda row: any(pd.notna(v) and str(v).strip() != "" for v in row), axis=1
            ).astype(int)

        # 当日予約フラグ
        if "予約手続日時" in self.data.columns:
            self.data["予約手続日"] = pd.to_datetime(self.data["予約手続日時"], errors="coerce").dt.strftime("%Y-%m-%d")
            self.data["当日予約"] = (self.data["予約手続日"] == self.data["予約日"]).astype(int)
        else:
            self.data["当日予約"] = 0

        # 来店済みフラグ
        self.data["来店済み"] = (1 - self.data["キャンセルフラグ"]).astype(int)

        # 日次集計用の辞書を作成
        agg_dict = {
            "キャンセルフラグ": "sum",
            "当日予約": "sum",
            "来店済み": "sum"
        }

        # 所要時間が存在する場合のみ追加
        if "所要時間" in self.data.columns:
            agg_dict["所要時間"] = "mean"

        # 日次集計
        self.daily_data = (
            self.data.groupby(["予約日", "店舗"], as_index=False)
            .agg(agg_dict)
        )

        # カラム名を変更
        rename_dict = {
            "キャンセルフラグ": "キャンセル数",
            "当日予約": "当日予約数",
            "来店済み": "来店件数"
        }

        if "所要時間" in agg_dict:
            rename_dict["所要時間"] = "平均所要時間"

        self.daily_data = self.daily_data.rename(columns=rename_dict)

        # 総予約件数
        self.daily_data["予約件数"] = self.data.groupby(["予約日", "店舗"]).size().values

        print(f"✅ 日次集計完了: {len(self.daily_data)}レコード")
        return self.daily_data

# ==========================================
# STEP 2.5: 予約データ特徴量エンジニアリングクラス
# ==========================================
class ReservationFeatureEngineer:
    """予約データから特徴量を生成するクラス"""

    def __init__(self):
        self.reservation_data = {}

    def load_reservation_data(self, reservation_data):
        """予約データを読み込み"""
        self.reservation_data = reservation_data
        print(f"📊 予約データを読み込み: {len(reservation_data)}シート")

        # データ検証
        for sheet_key, df in reservation_data.items():
            if not df.empty:
                print(f"  - {sheet_key}: {len(df)}件のデータ")
                # 必要な列の存在確認
                required_cols = ['日付', 'date', '予約日', '来店日']
                has_date_col = any(col in df.columns for col in required_cols)
                if not has_date_col:
                    print(f"    ⚠️ 警告: {sheet_key}に日付列が見つかりません")
            else:
                print(f"  - {sheet_key}: データが空です")

    def process_reservation_data(self):
        """予約データを処理して特徴量を生成"""
        print("\n🔧 予約データ特徴量を生成中...")

        features = {}

        # 各シートのデータを処理
        for sheet_key, df in self.reservation_data.items():
            if df.empty:
                print(f"⚠️ {sheet_key}: データが空のためスキップ")
                continue

            print(f"📋 {sheet_key} を処理中... ({len(df)}件)")

            # 日付列を正規化
            df_processed = self._normalize_date_columns(df.copy())

            if df_processed.empty:
                continue

            # 日付別集計
            daily_features = self._generate_daily_features(df_processed, sheet_key)

            # 店舗別集計
            store_features = self._generate_store_features(df_processed, sheet_key)

            # 時間帯別集計
            time_features = self._generate_time_features(df_processed, sheet_key)

            # メニュー別集計
            menu_features = self._generate_menu_features(df_processed, sheet_key)

            features[sheet_key] = {
                'daily': daily_features,
                'store': store_features,
                'time': time_features,
                'menu': menu_features
            }

        # キャンセル率を計算
        cancellation_features = self._calculate_cancellation_rates(features)

        return features, cancellation_features

    def _normalize_date_columns(self, df):
        """日付列を正規化"""
        date_columns = ['日付', 'date', '予約日', '来店日']

        for col in date_columns:
            if col in df.columns:
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                    df = df.dropna(subset=[col])
                    df['日付'] = df[col].dt.date
                    break
                except:
                    continue

        return df

    def _generate_daily_features(self, df, sheet_key):
        """日付別特徴量を生成"""
        if '日付' not in df.columns:
            return pd.DataFrame()

        daily_agg = df.groupby('日付').agg({
            df.columns[0]: 'count'  # 件数
        }).reset_index()

        daily_agg.columns = ['日付', f'{sheet_key}_件数']
        return daily_agg

    def _generate_store_features(self, df, sheet_key):
        """店舗別特徴量を生成"""
        store_columns = ['店舗', 'store', '店舗名', 'メインメニュー名']

        for col in store_columns:
            if col in df.columns:
                store_agg = df.groupby(['日付', col]).size().reset_index(name=f'{sheet_key}_店舗別件数')
                return store_agg

        return pd.DataFrame()

    def _generate_time_features(self, df, sheet_key):
        """時間帯別特徴量を生成"""
        time_columns = ['時間帯', 'time', '開始', '時間']

        for col in time_columns:
            if col in df.columns:
                time_agg = df.groupby(['日付', col]).size().reset_index(name=f'{sheet_key}_時間帯別件数')
                return time_agg

        return pd.DataFrame()

    def _generate_menu_features(self, df, sheet_key):
        """メニュー別特徴量を生成"""
        menu_columns = ['メインメニュー名', 'menu', 'メニュー', 'サービス']

        for col in menu_columns:
            if col in df.columns:
                menu_agg = df.groupby(['日付', col]).size().reset_index(name=f'{sheet_key}_メニュー別件数')
                return menu_agg

        return pd.DataFrame()

    def _calculate_cancellation_rates(self, features):
        """キャンセル率を計算"""
        cancellation_features = pd.DataFrame()

        # sheet2（キャンセル含む）とsheet5（キャンセル抜き）からキャンセル率を計算
        if 'sheet2' in features and 'sheet5' in features:
            sheet2_daily = features['sheet2'].get('daily', pd.DataFrame())
            sheet5_daily = features['sheet5'].get('daily', pd.DataFrame())

            if not sheet2_daily.empty and not sheet5_daily.empty:
                # 日付でマージ
                merged = pd.merge(sheet2_daily, sheet5_daily, on='日付', how='outer', suffixes=('_total', '_actual'))
                merged = merged.fillna(0)

                # キャンセル率を計算
                merged['キャンセル件数'] = merged['sheet2_件数'] - merged['sheet5_件数']
                merged['キャンセル率'] = merged['キャンセル件数'] / merged['sheet2_件数'].replace(0, 1)
                merged['キャンセル率'] = merged['キャンセル率'].clip(0, 1)  # 0-1の範囲に制限

                cancellation_features = merged[['日付', 'キャンセル件数', 'キャンセル率']]

        return cancellation_features

    def merge_with_daily_data(self, daily_data, reservation_features, cancellation_features):
        """既存の日次データと予約特徴量をマージ"""
        print("\n🔗 予約特徴量を既存データとマージ中...")

        # 日付列を統一
        daily_data['日付'] = pd.to_datetime(daily_data['予約日']).dt.date

        # 各シートの日次特徴量をマージ
        for sheet_key, features in reservation_features.items():
            daily_features = features.get('daily', pd.DataFrame())
            if not daily_features.empty:
                daily_data = pd.merge(daily_data, daily_features, on='日付', how='left')

        # キャンセル特徴量をマージ
        if not cancellation_features.empty:
            daily_data = pd.merge(daily_data, cancellation_features, on='日付', how='left')

        # 欠損値を0で埋める（予約データがない過去の日付に対する補完）
        reservation_columns = [col for col in daily_data.columns if any(sheet in col for sheet in ['sheet1', 'sheet2', 'sheet5', 'キャンセル'])]
        daily_data[reservation_columns] = daily_data[reservation_columns].fillna(0)

        # 予約データがない過去の日付に対する追加の補完処理
        print(f"📊 予約データがない過去の日付を0で補完中...")

        print(f"✅ 予約特徴量マージ完了: {len(reservation_columns)}個の新特徴量を追加")
        print(f"   - 予約データがない過去の日付は0で補完済み")

        return daily_data

# ==========================================
# STEP 3: 特徴量エンジニアリングクラス
# ==========================================
class FeatureEngineer:
    """特徴量エンジニアリングを行うクラス"""

    def __init__(self):
        self.weather_cache_file = "weather_cache.csv"
        self.city_coords = {
            "表参道": (35.6655, 139.7123),
            "新宿": (35.6938, 139.7034),
            "新宿WOMEN'S": (35.6938, 139.7034),
            "日本橋": (35.6825, 139.7741),
            "吉祥寺": (35.7033, 139.5795),
            "横浜": (35.4656, 139.6221),
            "名古屋栄": (35.1696, 136.9086),
            "大阪梅田": (34.7044, 135.4959),
            "福岡天神": (33.5902, 130.4017),
            "神戸三宮": (34.6937, 135.1955),
            "渋谷MODI": (35.6591, 139.7006),
            "有楽町": (35.6749, 139.7633)
        }

    def add_datetime_features(self, daily_data):
        """日時関連特徴量を追加"""
        print("\n🗓️ Step 4: 日時特徴量を追加中...")

        # 日付をdatetime型に変換
        daily_data["予約日_dt"] = pd.to_datetime(daily_data["予約日"], errors="coerce")

        # 曜日・曜日コード
        daily_data["曜日コード"] = daily_data["予約日_dt"].dt.weekday
        day_map = {0:"月", 1:"火", 2:"水", 3:"木", 4:"金", 5:"土", 6:"日"}
        daily_data["曜日"] = daily_data["曜日コード"].map(day_map)

        # 祝日フラグ
        def is_holiday(date):
            if pd.isna(date):
                return False
            d = pd.to_datetime(date)
            return jpholiday.is_holiday(d) or d.weekday() >= 5

        daily_data["祝日フラグ"] = daily_data["予約日_dt"].apply(is_holiday).astype(int)

        # 季節性特徴量
        daily_data["週番号"] = daily_data["予約日_dt"].dt.isocalendar().week.astype(int)
        daily_data["月番号"] = daily_data["予約日_dt"].dt.month.astype(int)
        daily_data["年"] = daily_data["予約日_dt"].dt.year.astype(int)

        print("✅ 日時特徴量追加完了")
        return daily_data

    def fetch_weather_data(self, store, lat, lon, start_date, end_date):
        """天気データを取得"""
        base_url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
            "timezone": "Asia/Tokyo"
        }

        try:
            r = requests.get(base_url, params=params, timeout=10)
            if r.status_code != 200:
                return pd.DataFrame(columns=["店舗", "日付", "平均気温", "降水量"])

            js = r.json()
            if "daily" not in js or len(js["daily"]["time"]) == 0:
                return pd.DataFrame(columns=["店舗", "日付", "平均気温", "降水量"])

            dfw = pd.DataFrame({
                "日付": js["daily"]["time"],
                "平均気温": (pd.Series(js["daily"]["temperature_2m_max"]) +
                           pd.Series(js["daily"]["temperature_2m_min"])) / 2,
                "降水量": js["daily"]["precipitation_sum"],
                "店舗": store
            })
            return dfw
        except Exception as e:
            print(f"⚠️ {store} の天気データ取得失敗: {e}")
            return pd.DataFrame(columns=["店舗", "日付", "平均気温", "降水量"])

    def add_weather_features(self, daily_data):
        """天気特徴量を追加"""
        print("\n🌤️ Step 5: 天気特徴量を追加中...")

        # キャッシュ読み込み
        if os.path.exists(self.weather_cache_file):
            weather_cache = pd.read_csv(self.weather_cache_file)
            print(f"💾 天気キャッシュ読み込み: {len(weather_cache)}件")
        else:
            weather_cache = pd.DataFrame(columns=["店舗", "日付", "平均気温", "降水量"])

        # 取得期間定義
        min_date = str(daily_data["予約日"].min())
        max_date = str(daily_data["予約日"].max())
        print(f"📅 天気データ取得期間: {min_date} → {max_date}")

        # 新規データ取得
        existing = set(zip(weather_cache["店舗"], weather_cache["日付"]))
        new_records = []

        for store, (lat, lon) in tqdm(self.city_coords.items(), desc="天気データ取得"):
            dates = pd.date_range(start=min_date, end=max_date)
            targets = [d.strftime("%Y-%m-%d") for d in dates
                      if (store, d.strftime("%Y-%m-%d")) not in existing]

            if len(targets) == 0:
                continue

            start_date, end_date = targets[0], targets[-1]
            dfw = self.fetch_weather_data(store, lat, lon, start_date, end_date)
            if not dfw.empty:
                new_records.append(dfw)

        # キャッシュ更新
        if len(new_records) > 0:
            new_weather = pd.concat(new_records, ignore_index=True)
            weather_cache = pd.concat([weather_cache, new_weather], ignore_index=True)
            weather_cache = weather_cache.drop_duplicates(subset=["店舗", "日付"], keep="last")
            weather_cache.to_csv(self.weather_cache_file, index=False)
            print(f"💾 天気キャッシュ更新: {len(new_weather)}件追加")

        # データマージ
        weather_cache["日付"] = pd.to_datetime(weather_cache["日付"]).dt.strftime("%Y-%m-%d")
        daily_data = daily_data.merge(
            weather_cache.rename(columns={"日付": "予約日"}),
            on=["店舗", "予約日"],
            how="left"
        )

        # 欠損値補完
        daily_data["平均気温"] = daily_data["平均気温"].fillna(daily_data["平均気温"].mean())
        daily_data["降水量"] = daily_data["降水量"].fillna(0)

        print("✅ 天気特徴量追加完了")
        return daily_data

    def add_historical_features(self, daily_data):
        """過去データ特徴量を追加"""
        print("\n📊 Step 6: 過去データ特徴量を追加中...")

        # 前年・前週・前年同曜日の日付
        daily_data["前年日付"] = daily_data["予約日_dt"] - pd.DateOffset(years=1)
        daily_data["前週日付"] = daily_data["予約日_dt"] - pd.Timedelta(days=7)
        daily_data["前年同曜日日付"] = daily_data["予約日_dt"] - pd.Timedelta(weeks=52)

        # 基準データ
        base_prev = daily_data[["店舗", "予約日_dt", "来店件数"]].rename(
            columns={"予約日_dt": "基準日", "来店件数": "基準件数"}
        )

        # 前年・前週・前年同曜日件数をマージ
        for label, col in [("前年日付", "前年件数"), ("前週日付", "前週件数"), ("前年同曜日日付", "前年同曜日件数")]:
            daily_data = daily_data.merge(
                base_prev.rename(columns={"基準日": label, "基準件数": col}),
                on=["店舗", label],
                how="left"
            )
            daily_data[col] = daily_data[col].fillna(0).astype(int)

        print("✅ 過去データ特徴量追加完了")
        return daily_data

# ==========================================
# STEP 4: 機械学習モデルクラス
# ==========================================
class PredictionModel:
    """機械学習予測モデルクラス"""

    def __init__(self):
        self.model = None
        self.feature_importance = None
        self.cv_scores = None
        self.best_params = None

    def prepare_features(self, daily_data):
        """特徴量準備"""
        print("\n🔧 Step 7: 特徴量準備中...")

        # ターゲット変数
        y = daily_data["来店件数"]

        # 基本特徴量選択
        feature_cols = [
            "曜日コード", "祝日フラグ", "平均気温", "降水量",
            "前年件数", "前週件数", "前年同曜日件数",
            "週番号", "月番号"
        ]

        # 予約データ特徴量を追加
        reservation_cols = [col for col in daily_data.columns
                           if any(keyword in col for keyword in ['sheet1', 'sheet2', 'sheet5', 'キャンセル'])]

        if reservation_cols:
            print(f"📊 予約データ特徴量を追加: {len(reservation_cols)}個")
            feature_cols.extend(reservation_cols)

        # 店舗エンコーディング
        X = pd.get_dummies(daily_data[feature_cols + ["店舗"]],
                          columns=["店舗"], prefix="店舗")

        print(f"✅ 特徴量準備完了: {X.shape[1]}次元 (予約特徴量: {len(reservation_cols)}個)")
        return X, y

    def train_model(self, X, y):
        """モデル訓練"""
        print("\n🤖 Step 8: モデル訓練中...")

        if LIGHTGBM_AVAILABLE:
            print("🚀 LightGBMモデルを使用します")
            # 時系列分割
            tscv = TimeSeriesSplit(n_splits=5)

            # ハイパーパラメータグリッド
            param_grid = {
                'num_leaves': [31, 50, 100],
                'learning_rate': [0.01, 0.05, 0.1],
                'feature_fraction': [0.8, 0.9, 1.0],
                'bagging_fraction': [0.8, 0.9, 1.0],
                'min_child_samples': [20, 50, 100]
            }

            # ベースモデル
            base_model = lgb.LGBMRegressor(
                objective='regression',
                metric='rmse',
                verbose=-1,
                random_state=42
            )

            # グリッドサーチ
            print("🔍 ハイパーパラメータ最適化中...")
            grid_search = GridSearchCV(
                base_model,
                param_grid,
                cv=tscv,
                scoring='neg_mean_absolute_error',
                n_jobs=-1,
                verbose=1
            )

            grid_search.fit(X, y)
        else:
            print("🌲 RandomForestモデルを使用します")
            # RandomForestを代替として使用
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            self.model.fit(X, y)

            # 簡単な評価
            pred = self.model.predict(X)
            score = mean_absolute_error(y, pred)
            print(f"✅ 訓練データ MAE: {score:.2f}")

            # 特徴量名を保存
            self.feature_names_ = X.columns.tolist()

            # RandomForest用の特徴量重要度
            self.feature_importance = pd.DataFrame({
                'feature': X.columns,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)

            return self.model

        if LIGHTGBM_AVAILABLE:
            self.model = grid_search.best_estimator_
            self.best_params = grid_search.best_params_
            self.cv_scores = -grid_search.best_score_

            # 特徴量重要度
            self.feature_importance = pd.DataFrame({
                'feature': X.columns,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)

            print(f"✅ モデル訓練完了")
            print(f"📊 最適CV MAE: {self.cv_scores:.4f}")
            print(f"⚙️ 最適パラメータ: {self.best_params}")

        return self.model

    def evaluate_model(self, X, y):
        """モデル評価"""
        print("\n📈 Step 9: モデル評価中...")

        # 予測
        y_pred = self.model.predict(X)

        # 評価指標
        mae = mean_absolute_error(y, y_pred)
        rmse = np.sqrt(mean_squared_error(y, y_pred))
        r2 = r2_score(y, y_pred)

        print(f"📊 モデル性能:")
        print(f"   MAE:  {mae:.4f}")
        print(f"   RMSE: {rmse:.4f}")
        print(f"   R²:   {r2:.4f}")

        return {"MAE": mae, "RMSE": rmse, "R2": r2}

# ==========================================
# 予測結果出力クラス
# ==========================================
class SpreadsheetOutputManager:
    """スプレッドシート出力管理クラス"""

    def __init__(self, gc):
        self.gc = gc

    def save_predictions_to_spreadsheet(self, predictions_1w, predictions_1m=None):
        """予測結果をスプレッドシートに保存"""
        if self.gc is None:
            print("⚠️ スプレッドシート接続が利用できません")
            return False

        try:
            print(f"\n📤 予測結果をスプレッドシートに出力中...")

            # 1週間予測を出力
            sheet_1w = self.gc.open_by_key(SPREADSHEET_ID).worksheet(OUTPUT_SHEET_1W)
            set_with_dataframe(sheet_1w, predictions_1w)
            print(f"✅ 2週間予測を '{OUTPUT_SHEET_1W}' シートに出力完了")

            # 2ヶ月予測を出力（提供されている場合）
            if predictions_1m is not None:
                sheet_1m = self.gc.open_by_key(SPREADSHEET_ID).worksheet(OUTPUT_SHEET_1M)
                set_with_dataframe(sheet_1m, predictions_1m)
                print(f"✅ 2ヶ月予測を '{OUTPUT_SHEET_1M}' シートに出力完了")

            return True

        except Exception as e:
            print(f"❌ スプレッドシート出力エラー: {e}")
            return False

# ==========================================
# STEP 5: 予測・可視化クラス
# ==========================================
class PredictionVisualizer:
    """予測結果の可視化・出力クラス"""

    def __init__(self, model, feature_engineer, output_manager=None):
        self.model = model
        self.feature_engineer = feature_engineer
        self.output_manager = output_manager

    def generate_future_predictions(self, daily_data, days_ahead=7):
        """未来予測生成"""
        print(f"\n🔮 Step 10: {days_ahead}日間の予測生成中...")

        # 未来日付生成（今日の日付を起算点とする）
        today = datetime.now().date()
        start_date = pd.to_datetime(today)  # 今日から開始
        future_dates = pd.date_range(start_date, start_date + timedelta(days=days_ahead-1))

        # 店舗リスト
        stores = daily_data["店舗"].unique()

        # 未来データフレーム作成
        future_data = []
        for store in stores:
            for date in future_dates:
                future_data.append({
                    "店舗": store,
                    "予約日": date.strftime("%Y-%m-%d"),
                    "予約日_dt": date
                })

        future_df = pd.DataFrame(future_data)

        # 特徴量追加
        future_df = self.feature_engineer.add_datetime_features(future_df)

        # 天気データ（過去7日間の平均を使用）
        weather_avg = []
        for store in stores:
            store_data = daily_data[daily_data["店舗"] == store].tail(7)
            weather_avg.append({
                "店舗": store,
                "平均気温": store_data["平均気温"].mean(),
                "降水量": store_data["降水量"].mean()
            })

        weather_avg_df = pd.DataFrame(weather_avg)
        future_df = future_df.merge(weather_avg_df, on="店舗", how="left")

        # 過去データ特徴量
        base_prev = daily_data[["店舗", "予約日_dt", "来店件数"]].rename(
            columns={"予約日_dt": "基準日", "来店件数": "基準件数"}
        )

        # 前年・前週・前年同曜日
        future_df["前年日付"] = future_df["予約日_dt"] - pd.DateOffset(years=1)
        future_df["前週日付"] = future_df["予約日_dt"] - pd.Timedelta(days=7)
        future_df["前年同曜日日付"] = future_df["予約日_dt"] - pd.Timedelta(weeks=52)

        for label, col in [("前年日付", "前年件数"), ("前週日付", "前週件数"), ("前年同曜日日付", "前年同曜日件数")]:
            future_df = future_df.merge(
                base_prev.rename(columns={"基準日": label, "基準件数": col}),
                on=["店舗", label],
                how="left"
            )
            future_df[col] = future_df[col].fillna(0).astype(int)

        # 予約データ特徴量を追加（存在する場合）
        reservation_cols = [col for col in daily_data.columns if any(sheet in col for sheet in ['sheet1', 'sheet2', 'sheet5', 'キャンセル'])]
        if reservation_cols:
            print(f"📊 将来予測用に予約データ特徴量を0で初期化: {len(reservation_cols)}個")
            # 予約データ特徴量は0で初期化（未来データなので予約データは利用できない）
            for col in reservation_cols:
                future_df[col] = 0

        # 特徴量準備
        feature_cols = [
            "曜日コード", "祝日フラグ", "平均気温", "降水量",
            "前年件数", "前週件数", "前年同曜日件数",
            "週番号", "月番号"
        ] + reservation_cols

        X_future = pd.get_dummies(future_df[feature_cols + ["店舗"]],
                                 columns=["店舗"], prefix="店舗")

        # 訓練時の特徴量に合わせる
        if LIGHTGBM_AVAILABLE and hasattr(self.model.model, 'feature_name_'):
            missing_cols = set(self.model.model.feature_name_) - set(X_future.columns)
            for col in missing_cols:
                X_future[col] = 0
            X_future = X_future[self.model.model.feature_name_]
        else:
            # RandomForestの場合、訓練時の特徴量順序を保持
            if hasattr(self.model, 'feature_names_'):
                missing_cols = set(self.model.feature_names_) - set(X_future.columns)
                for col in missing_cols:
                    X_future[col] = 0
                X_future = X_future[self.model.feature_names_]

        # 予測実行
        future_df["予測来店件数"] = self.model.model.predict(X_future)
        future_df["予測来店件数"] = future_df["予測来店件数"].round().astype(int)

        print(f"✅ {days_ahead}日間の予測完了")
        return future_df[["予約日", "店舗", "予測来店件数", "曜日", "祝日フラグ"]]

    def display_predictions(self, predictions):
        """予測結果表示"""
        print("\n" + "="*80)
        print("🔮 来週の来店件数予測結果")
        print("="*80)

        # 週間サマリー
        weekly_total = predictions["予測来店件数"].sum()
        daily_avg = weekly_total / 7

        print(f"\n📊 週間予測サマリー")
        print("-" * 50)
        print(f"週間合計予測件数: {weekly_total:,}件")
        print(f"1日平均予測件数: {daily_avg:.1f}件")

        # 店舗別ランキング
        print(f"\n🏪 店舗別週間合計ランキング")
        print("-" * 50)

        store_totals = predictions.groupby("店舗")["予測来店件数"].sum().sort_values(ascending=False)
        for rank, (store, total) in enumerate(store_totals.items(), 1):
            avg_per_day = total / 7
            print(f"{rank:2d}位 {store:15} : {total:3d}件 (平均{avg_per_day:.1f}件/日)")

        # 日別予測
        print(f"\n📅 日別予測詳細")
        print("-" * 80)

        for date in predictions["予約日"].unique():
            date_data = predictions[predictions["予約日"] == date]
            weekday = date_data.iloc[0]["曜日"]
            is_holiday = date_data.iloc[0]["祝日フラグ"]
            daily_total = date_data["予測来店件数"].sum()

            holiday_mark = " 🎌" if is_holiday else ""
            print(f"\n📅 {date} ({weekday}){holiday_mark}: 合計 {daily_total:3d}件")
            print("-" * 40)

            for _, row in date_data.iterrows():
                print(f"  {row['店舗']:15} : {row['予測来店件数']:3d}件")

    def plot_feature_importance(self):
        """Plot feature importance in English"""
        if not hasattr(self.model, 'feature_importance') or self.model.feature_importance is None:
            print("⚠️ Feature importance is not available")
            return

        # グラフをファイルに保存（表示しない）
        plt.figure(figsize=(10, 8))
        top_features = self.model.feature_importance.head(15)

        sns.barplot(data=top_features, y='feature', x='importance', palette='viridis')

        # Use English labels to avoid font issues
        plt.title('Feature Importance Top 15', fontsize=16, fontweight='bold')
        plt.xlabel('Importance', fontsize=12)
        plt.ylabel('Feature', fontsize=12)

        plt.tight_layout()
        plt.savefig('feature_importance.png')
        plt.close()
        print("📊 特徴量重要度グラフを feature_importance.png に保存しました")

        print("\n📈 Top 10 Important Features:")
        for i, (_, row) in enumerate(top_features.head(10).iterrows(), 1):
            print(f"{i:2d}. {row['feature']:30} {row['importance']:.4f}")

# ==========================================
# メイン実行部分
# ==========================================
def main():
    """メイン実行関数"""
    try:
        # Step 1: スプレッドシート接続
        gc = setup_spreadsheet_connection()
        if gc is None:
            print("❌ スプレッドシート接続に失敗しました")
            return None, None, None

        output_manager = SpreadsheetOutputManager(gc)

        # Step 2: データ取得
        raw_data = load_data_from_spreadsheet(gc)
        if raw_data is None:
            print("❌ スプレッドシートからのデータ読み込みに失敗しました")
            return None, None, None

        # 予約データも取得
        reservation_data = load_reservation_data_from_spreadsheet(gc)

        # Step 3-4: データ処理
        processor = DataProcessor()
        processed_data = processor.load_and_clean_data(data=raw_data)
        if processed_data is None:
            print("❌ データ処理に失敗しました")
            return None, None, None

        daily_data = processor.aggregate_daily_data()

        # Step 4.5: 予約データ特徴量エンジニアリング
        reservation_engineer = ReservationFeatureEngineer()
        reservation_engineer.load_reservation_data(reservation_data)
        reservation_features, cancellation_features = reservation_engineer.process_reservation_data()
        daily_data = reservation_engineer.merge_with_daily_data(daily_data, reservation_features, cancellation_features)

        # Step 5-7: 特徴量エンジニアリング
        engineer = FeatureEngineer()
        daily_data = engineer.add_datetime_features(daily_data)
        daily_data = engineer.add_weather_features(daily_data)
        daily_data = engineer.add_historical_features(daily_data)

        # Step 8-9: モデル訓練・評価
        model = PredictionModel()
        X, y = model.prepare_features(daily_data)
        model.train_model(X, y)
        model.evaluate_model(X, y)

        # Step 10-11: 予測・可視化・出力
        visualizer = PredictionVisualizer(model, engineer, output_manager)
        predictions_1w = visualizer.generate_future_predictions(daily_data, days_ahead=14)
        predictions_1m = visualizer.generate_future_predictions(daily_data, days_ahead=60)

        visualizer.display_predictions(predictions_1w)
        visualizer.plot_feature_importance()

        # スプレッドシートに出力
        if output_manager:
            output_manager.save_predictions_to_spreadsheet(predictions_1w, predictions_1m)

        print("\n" + "="*80)
        print("🎉 SHARINGAN ENGINE 予測完了！")
        print(f"📊 結果はスプレッドシート '{OUTPUT_SHEET_1W}' と '{OUTPUT_SHEET_1M}' に出力されました")
        print("="*80)

        return predictions_1w, model, daily_data

    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None

# 実行
if __name__ == "__main__":
    predictions, model, daily_data = main()
