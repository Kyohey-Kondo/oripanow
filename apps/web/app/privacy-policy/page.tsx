import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'プライバシーポリシー｜オリパなう',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: '#f9f9f9', minHeight: '100vh' }}>
      <div className={styles.container}>
        <h1 className={styles.title}>プライバシーポリシー</h1>
        <p className={styles.updated}>最終更新日：2025年4月25日</p>

        <p className={styles.intro}>
          tacos（以下「運営者」）は、オリパなう（以下「本サービス」）における利用者の個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
        </p>

        <h2 className={styles.section}>1. 収集する情報</h2>
        <p className={styles.text}>本サービスでは、以下の情報を収集することがあります。</p>
        <ul className={styles.list}>
          <li>アクセスログ（IPアドレス、ブラウザの種類、参照元URL、アクセス日時など）</li>
          <li>Cookieおよびこれに類する技術を通じて取得される情報</li>
          <li>広告配信サービスを通じて収集される情報</li>
        </ul>

        <h2 className={styles.section}>2. 情報の利用目的</h2>
        <p className={styles.text}>収集した情報は、以下の目的で利用します。</p>
        <ul className={styles.list}>
          <li>本サービスの提供・運営・改善</li>
          <li>アクセス解析によるサービス品質の向上</li>
          <li>広告の配信・効果測定</li>
          <li>不正アクセス・不正利用の検知および防止</li>
        </ul>

        <h2 className={styles.section}>3. 第三者への提供</h2>
        <p className={styles.text}>
          運営者は、法令に基づく場合を除き、利用者の個人情報を事前の同意なく第三者に提供しません。
        </p>

        <h2 className={styles.section}>4. 広告について</h2>
        <p className={styles.text}>
          本サービスでは、第三者の広告サービスを利用することがあります。広告配信事業者は、利用者のCookieを使用して、興味・関心に基づいた広告を表示することがあります。
        </p>
        <p className={styles.text}>
          Cookieの使用を希望しない場合は、ブラウザの設定からCookieを無効にすることができます。ただし、一部のサービスが正常に利用できなくなる場合があります。
        </p>

        <h2 className={styles.section}>5. アフィリエイトについて</h2>
        <p className={styles.text}>
          本サービスは、アフィリエイトプログラムに参加しています。本サービス内のリンクを経由して商品・サービスをご購入いただいた場合、運営者が報酬を受け取ることがあります。利用者への費用は一切発生しません。
        </p>

        <h2 className={styles.section}>6. アクセス解析ツールについて</h2>
        <p className={styles.text}>
          本サービスでは、Googleアナリティクス等のアクセス解析ツールを使用することがあります。これらのツールはCookieを使用してデータを収集しますが、個人を特定する情報は含まれません。詳細については各サービスのプライバシーポリシーをご確認ください。
        </p>

        <h2 className={styles.section}>7. Cookieの管理</h2>
        <p className={styles.text}>
          本サービスはCookieを使用します。ブラウザの設定によりCookieを無効にすることが可能ですが、その場合サービスの一部機能が利用できなくなる場合があります。
        </p>

        <h2 className={styles.section}>8. プライバシーポリシーの変更</h2>
        <p className={styles.text}>
          運営者は、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは本ページに掲載した時点から効力を生じるものとします。
        </p>

        <h2 className={styles.section}>9. お問い合わせ</h2>
        <p className={styles.text}>
          本ポリシーに関するお問い合わせは、本サービス内のお問い合わせフォームよりご連絡ください。
        </p>

        <h2 className={styles.section}>10. 免責事項</h2>
        <p className={styles.text}>
          本サービスに掲載しているオリパの情報（価格・封入率・ラインナップ等）は、可能な限り正確な情報を提供するよう努めておりますが、その正確性・完全性・最新性を保証するものではありません。
        </p>
        <p className={styles.text}>
          本サービス内のリンクを経由して遷移した外部サイトのコンテンツ・サービス・取引について、運営者は一切の責任を負いません。外部サイトのご利用は利用者自身の判断と責任において行ってください。
        </p>
        <p className={styles.text}>
          本サービスの利用により利用者に生じた損害について、運営者は一切の責任を負わないものとします。
        </p>

        <div className={styles.footerNote}>運営者：tacos／オリパなう</div>
      </div>
    </div>
  );
}
