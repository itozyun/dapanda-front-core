import {ApiTelegram} from "%/blanco/restgenerator/valueobject/ApiTelegram";
import {CommonRequest} from "%/blanco/restgenerator/valueobject/CommonRequest";
import {CommonResponse} from "%/blanco/restgenerator/valueobject/CommonResponse";
import axios, {AxiosError, AxiosResponse} from "axios";
import {MessageItem} from "%/blanco/restgenerator/valueobject/MessageItem";
import {CommunicationOptions} from "@/components/framework/CommunicationController/CommunicatoinTypes";
import {DapandaConst} from "@/common/DapandaGlobals";
import {RequestHeader} from "%/blanco/restgenerator/valueobject/RequestHeader";
import {LoginInfo} from "%/common/LoginInfo";
import {mapState} from "pinia";
import {useLocaleSettingStore} from "%/stores/LocaleSettingStore/LocaleSettingStore";
import {Locale} from "%/blanco/restgenerator/valueobject/Locale";
import {RestoreLoginDataCallbackType, RestoreLoginDataOptions} from "@/common/RestoreLoginInfoOptions";
import {useAuthenticationControllerStore} from "%/stores/AuthenticationControllerStore/AuthenticationControllerStore";
import {ResponseHeader} from "%/blanco/restgenerator/valueobject/ResponseHeader";
import {ApiPlainCommonPostError} from "%/common/api/plain/ApiPlainCommonPostError";
import {ApiPlainCommonGetError} from "%/common/api/plain/ApiPlainCommonGetError";
import {ApiPlainCommonPutError} from "%/common/api/plain/ApiPlainCommonPutError";
import {ApiPlainCommonDeleteError} from "%/common/api/plain/ApiPlainCommonDeleteError";
import {PlainResponseHeader} from "%/blanco/restgenerator/valueobject/PlainResponseHeader";

/**
 * API 電文処理のベースクラスです。
 * API 電文処理クラスは、このクラスを拡張しなければなりません。
 */
export abstract class ApiBase {
    /**
     * エラー
     */
    private _messages: Array<MessageItem> = [];

    /**
     * レスポンス
     */
    private _commonResponse?: CommonResponse = undefined;

    private _apiEndpoint: string | undefined;

    get messages(): Array<MessageItem> {
        return this._messages;
    }

    set messages(messages: Array<MessageItem>) {
        this._messages = messages;
    }

    hasErrors(): boolean {
        return this._messages.length > 0;
    }

    get commonResponse(): CommonResponse | undefined {
        return this._commonResponse;
    }

    get apiEndpoint(): string | undefined {
        return this._apiEndpoint;
    }

    set apiEndpoint(endpoint: string | undefined) {
        this._apiEndpoint = endpoint;
    }

    /**
     * この API の戻り値をセットする store の Action を表す文字列
     */
    // abstract getStoreActionId(
    //   argHttpMethod: string,
    //   options?: CommunicatorOptions
    // ): string;

    /**
     * API呼び出しのEntryポイント
     * @param request
     * @param processName
     * @param method
     * @param issuer
     * @param authHeader?
     * @param useBearer?
     * @param options?
     *
     */
    async send(
        request: ApiTelegram,
        processName: string,
        method: string,
        issuer: string,
        authHeader?: string,
        useBearer?: boolean,
        options?: CommunicationOptions | undefined): Promise<CommonResponse | undefined> {
        if (import.meta.env.VITE_APP_API_TELEGRAM_STYLE === "plain") {
            return this.sendPlain(request, processName, method, issuer, authHeader, useBearer, options);
        } else {
            return this.sendBlanco(request, processName, method, issuer, authHeader, useBearer, options);
        }
    }

    /**
     * API呼び出しのEntryポイント
     * @param request
     * @param processName
     * @param method
     * @param issuer
     * @param authHeader?
     * @param useBearer?
     * @param options?
     *
     */
    async sendBlanco(
        request: ApiTelegram,
        processName: string,
        method: string,
        issuer: string,
        authHeader?: string,
        useBearer?: boolean,
        options?: CommunicationOptions | undefined): Promise<CommonResponse | undefined> {
        let body: string = "";

        const commonRequest = this.makeCommonRequest(request);
        body = JSON.stringify(commonRequest);
        console.log("ApiBase#send: json = " + body);

        /* prepare accessToken for X-Dapanda-AccessToken header */
        let authError = false;
        let loginToken = "";
        if (this.isAuthenticationRequired()) {
            const loginInfo = await this.prepareLoginInfo(issuer);
            if (loginInfo) {
                loginToken = loginInfo.loginToken;
            } else {
                /* TODO Error handling */
                authError = true;
            }
        }

        var uri: string;
        let res;
        if (authError) {
            this._commonResponse = new CommonResponse();
            const info = new ResponseHeader();
            // TODO set locale etc.
            info.result = DapandaConst.ResultError;
            const message = new MessageItem();
            message.messages = "Auth Error";
            message.code = "";
            this._commonResponse.messages = [message];
        } else if (!("VITE_APP_API_ENDPOINT" in import.meta.env)) {
            /* GET JSON FILE */
            uri = this.getJsonFileName(request, processName, method, options);
            res = await axios.get<CommonResponse>(uri);
            this._commonResponse = res.data;
        } else {
            uri = import.meta.env.VITE_APP_API_ENDPOINT + this.locationURL;
            let headers: { [key: string]: string } = {};
            headers["content-type"] = "application/json";
            if (loginToken && loginToken != "") {
                let myToken = loginToken;
                if (useBearer) {
                    myToken = "Bearer " + loginToken;
                }
                let myAuthHeader = DapandaConst.DapandaAccessTokenHeader;
                if (authHeader) {
                    myAuthHeader = authHeader;
                }
                headers[myAuthHeader] = myToken;
            }
            if (options && options.additionalHeaders) {
                headers = Object.assign(headers, options.additionalHeaders);
            }
            try {
                switch (method) {
                    case DapandaConst.HttpMethodPost:
                        res = await axios.post<CommonResponse>(uri, body, {headers});
                        break;
                    case DapandaConst.HttpMethodPut:
                        res = await axios.put<CommonResponse>(uri, body, {headers});
                        break;
                    case DapandaConst.HttpMethodGet:
                        uri += "?request=" + encodeURI(body);
                        res = await axios.get<CommonResponse>(uri, {headers});
                        break;
                    case DapandaConst.HttpMethodDelete:
                        uri += "?request=" + encodeURI(body);
                        res = await axios.delete<CommonResponse>(uri, {headers});
                        break;
                    default:
                        throw "Invalid method.";
                }
            } catch (exception) {
                res = (exception as AxiosError).response;
            }

            if (res) {
                this._commonResponse = res.data as CommonResponse;
            } else {
                console.log("ApiBase#send !!! NO RESPONSE FOUND !!!");
                return undefined;
            }
        }

        if (this._commonResponse) {
            if (
                this._commonResponse.messages &&
                this._commonResponse.messages.length !== 0
            ) {
                console.log("API message num = " + this._commonResponse.messages.length);
                this.messages = this._commonResponse.messages;
            }
        }

        if (!this._commonResponse) {
            return undefined;
        }
        return this._commonResponse;
    }

    /**
     * telegramType plain の時の API 呼び出しのEntryポイント
     * @param request
     * @param processName
     * @param method
     * @param issuer
     * @param authHeader?
     * @param useBearer?
     * @param options?
     *
     */
    async sendPlain(
        request: ApiTelegram,
        processName: string,
        method: string,
        issuer: string,
        authHeader?: string,
        useBearer?: boolean,
        options?: CommunicationOptions | undefined): Promise<CommonResponse | undefined> {

        /* prepare accessToken for X-Dapanda-AccessToken header */
        let authError = false;
        let loginToken = "";
        if (this.isAuthenticationRequired()) {
            const loginInfo = await this.prepareLoginInfo(issuer);
            if (loginInfo) {
                loginToken = loginInfo.loginToken;
            } else {
                /* TODO Error handling */
                authError = true;
            }
        }

        let isMethodPost = method === DapandaConst.HttpMethodPost;
        let isMethodPut = method === DapandaConst.HttpMethodPut;
        let isMethodGet = method === DapandaConst.HttpMethodGet;
        let isMethodDelete = method === DapandaConst.HttpMethodDelete;

        if (!isMethodPost && !isMethodPut && !isMethodGet && !isMethodDelete) {
                throw "Invalid method.";
        }

        let body = JSON.stringify(request);
        console.log("ApiBase#send: json = " + body);

        let uri: string;
        let res;
        if (authError) {
            console.log("ApiBase#sendPlain: authError");
            this._commonResponse = new CommonResponse();
            const info = new PlainResponseHeader();
            // TODO set locale etc.
            info.result = DapandaConst.ResultError;
            info.status = 403;
            info.statusText = "Authentication Error";
            let telegram;
            if (isMethodPost) {
                telegram = new ApiPlainCommonPostError();
            } else if (isMethodPut) {
                telegram = new ApiPlainCommonPutError();
            } else if (isMethodGet) {
                telegram = new ApiPlainCommonGetError();
            } else {
                /* delete */
                telegram = new ApiPlainCommonDeleteError();
            }
            telegram.code = "";
            telegram.message = "Auth Error";
            this._commonResponse.telegram = telegram;
        } else if (!("VITE_APP_API_ENDPOINT" in import.meta.env)) {
            /* GET JSON FILE */
            uri = this.getJsonFileName(request, processName, method, options);
            res = await axios.get<CommonResponse>(uri);
            this._commonResponse = res.data;
        } else {
            if (typeof this._apiEndpoint !== 'undefined') {
                uri = this._apiEndpoint + this.locationURL;
            } else {
                uri = import.meta.env.VITE_APP_API_ENDPOINT + this.locationURL;
            }
            let headers: { [key: string]: string } = {};
            headers["content-type"] = "application/json";
            /* TODO: Add locale information headers here. */
            if (loginToken && loginToken != "") {
                let myToken = loginToken;
                if (useBearer) {
                    myToken = "Bearer " + loginToken;
                }
                let myAuthHeader = DapandaConst.DapandaAccessTokenHeader;
                if (authHeader) {
                    myAuthHeader = authHeader;
                }
                headers[myAuthHeader] = myToken;
            }
            if (options && options.additionalHeaders) {
                headers = Object.assign(headers, options.additionalHeaders);
            }
            try {
                const params = request;
                /* TODO axiosStatic を呼び出しているので毎回セットしなくていいのでは？という気がする。 */
                axios.interceptors.response.use(this.responseOnFulfilled, this.responseOnRejected)
                switch (method) {
                    case DapandaConst.HttpMethodPost:
                        res = await axios.post<CommonResponse>(uri, request, {headers});
                        break;
                    case DapandaConst.HttpMethodPut:
                        res = await axios.put<CommonResponse>(uri, request, {headers});
                        break;
                    case DapandaConst.HttpMethodGet:
                        res = await axios.get<CommonResponse>(uri,  {params, headers});
                        break;
                    case DapandaConst.HttpMethodDelete:
                        res = await axios.delete<CommonResponse>(uri, {params, headers});
                        break;
                    default:
                        throw "Invalid method.";
                }
            } catch (exception) {
                res = (exception as AxiosError).response;
            }

            if (res) {
                this._commonResponse = res.data as CommonResponse;
            } else {
                console.log("ApiBase#send !!! NO RESPONSE FOUND !!!");
                return undefined;
            }
        }
        /* possibly undefined. */
        return this._commonResponse;
    }

    /**
     * LoginInfo準備用
     * @param component emitを実施するコンポーネント
     */
    async prepareLoginInfo(issuer: string): Promise<LoginInfo> {
        return new Promise<LoginInfo>((resolve, reject) => {
            console.log("### prepareLoginInfo start");
            let restoreLoginDataCallback: RestoreLoginDataCallbackType = function (
                loginInfo: LoginInfo | undefined,
                authRequired: boolean,
                restoreTransitData: boolean,
                transitTo: string
            ): void {
                if (loginInfo) {
                    /* Authenticated. Change authStatus to valid. */
                    authStore.setStatus(DapandaConst.AuthenticationStatusValid, issuer);
                    resolve(loginInfo);
                } else {
                    /* Not Authenticated. authStatus is already invalidated. */
                    reject(undefined);
                }
            };
            const options: RestoreLoginDataOptions = {
                callback: restoreLoginDataCallback,
                authRequired: false,
                restoreTransitData: false,
                transitTo: ""
            };

            /* It may work */
            const authStore = useAuthenticationControllerStore();
            /* async */
            authStore.restore(options, issuer);
            console.log("### prepareLoginInfo end");
        });
    }

    /**
     * デバグ用JSONの読込ルーチン。
     * JSON ファイルは
     * public/json/api/電文処理ID/電文ID.json
     * とし、1 API につき固定の 1 JSON を返す。
     *
     * リクエストの中身によって送り返すJSONを変えたい場合は、各電文処理で
     * このメソッドを override して、個別の処理を書く事。
     * @param request
     */
    protected getJsonFileName(
        request: ApiTelegram,
        processName: string,
        method: string,
        options: CommunicationOptions | undefined = undefined
    ): string {
        return "/jsons/api/" + processName + "/" + method + "CommonResponse.json";
    }

    /**
     * 電文をAPIのエンベロープ（CommonRequest）でくるみます。
     * header 情報（token の設定など）もここで行います。
     * @param component
     * @param request
     */
    private makeCommonRequest(
        request: ApiTelegram
    ): CommonRequest {
        const info = this.prepareRequestHeader();

        const commonRequest = new CommonRequest();
        commonRequest.info = info;
        commonRequest.telegram = request;

        return commonRequest;
    }

    /**
     * RequestHeaderを準備します
     */
    private prepareRequestHeader(): RequestHeader {
        const header = new RequestHeader();
        const states = mapState(useLocaleSettingStore, {
            lang: store => store.lang,
            tz: store => store.tz,
            currency: store => store.currency,
            country: store => store.country
        });
        const locale = new Locale();
        locale.lang = states.lang();
        locale.tz = states.tz();
        locale.currency = states.currency();
        return header;
    }

    /**
     * axios interceptor for onFulfilled.
     * @param response
     */
    private responseOnFulfilled = (response: AxiosResponse<ApiTelegram>): AxiosResponse<CommonResponse> => {
        return this.convertToCommonResponse(response, DapandaConst.ResultSuccess);
    }

    /**
     * axios interceptor for onRejected.
     * @param error
     */
    private responseOnRejected = (error: any): AxiosResponse<CommonResponse> => {
        const axiosError: AxiosError = error;
        if (axiosError.response) {
            /* application error */
            const response = axiosError.response as AxiosResponse<ApiTelegram>;
            return this.convertToCommonResponse(response, DapandaConst.ResultError);
        } else {
            throw axiosError
        }
    }

    /**
     * Convert AxiosResponse<ApiTelegram> into AxiosResponse<CommonResponse>
     * @param response
     * @param result
     * @private
     */
    private convertToCommonResponse(response: AxiosResponse<ApiTelegram>, result: string): AxiosResponse<CommonResponse> {
        const commonResponse = new CommonResponse();
        const info = new PlainResponseHeader();
        info.result = result;
        info.statusText = response.statusText;
        info.status = response.status;
        info.time = response.headers[DapandaConst.DapandaElapsedTime];
        const locale = new Locale();
        locale.lang = response.headers[DapandaConst.DapandaLanguage];
        locale.tz = response.headers[DapandaConst.DapandaTimezone];
        locale.currency = response.headers[DapandaConst.DapandaCurrency];
        info.locale = locale;
        commonResponse.info = info;
        commonResponse.telegram = response.data;
        return {
            data: commonResponse,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: response.config,
            request: response.request
        };
    }

    protected isAuthenticationRequired(): boolean | undefined {
        return false;
    }

    protected get locationURL(): string {
        return "";
    }
}
