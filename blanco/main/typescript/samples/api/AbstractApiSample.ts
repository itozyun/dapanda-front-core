/*
 * This source code has been generated by blanco Framework.
 */
import { ApiBase } from "@/common/ApiBase";

/**
 * blancoRestのサンプルAPIです。
 */
export abstract class AbstractApiSample extends ApiBase {
    /**
     * 規定値   [/api/ApiSample]
     */
    private _locationURL: string = "/api/ApiSample";

    /**
     * APIが認証を必要とするかどうかのフラグです．必要な場合はtrueです．
     *
     * @return APIが認証を必要とするかどうかのフラグです．必要な場合はtrueです．
     */
    isAuthenticationRequired(): boolean | undefined {
        return true;
    }

    /**
     * フィールド [_locationURL]のセッターメソッド
     *
     * 項目の型 [string]
     *
     * @param argLocationURL フィールド[_locationURL]に格納したい値
     */
    set locationURL(argLocationURL: string) {
        this._locationURL = argLocationURL;
    }

    /**
     * フィールド[_locationURL]のゲッターメソッド
     *
     * 項目の型 [string]
     *
     * @return フィールド[_locationURL]に格納されている値
     */
    get locationURL(): string {
        return this._locationURL;
    }
}
