import {NavigationGuardNext, RouteLocationNormalized, Router} from "vue-router";
import {LoginInfo} from "%/common/LoginInfo";
import {Component, ComponentInternalInstance} from "vue";
import {_GettersTree, mapStores, Store} from "pinia";
import {RestoreLoginDataCallbackType, RestoreLoginDataOptions} from "@/common/RestoreLoginInfoOptions";
import {
    AuthenticationControllerStoreState
} from "%/stores/AuthenticationControllerStore/AuthenticationControllerStoreState";
import {
    AuthenticationControllerStoreActionsTree
} from "%/stores/AuthenticationControllerStore/DefineAuthenticationControllerStoreActions";
import {useAuthenticationControllerStore} from "%/stores/AuthenticationControllerStore/AuthenticationControllerStore";

/**
 * VueRouter の共通 hook はここに実装します。
 *
 */
export class RouterHooks {
    /**
     * routeが解決される前に呼ばれる Global Guard の実装
     * @param router
     * @param to
     * @param from
     * @param next
     */
    static beforeResolve(router: Router, to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext, nopagePath: string) {
        console.log(
            "RouterHooks#beforeResolve: from " + from.path + " to " + to.path
        );

        /*
         * to がrouterに登録済みかどうかチェックする。
         */
        let resolved = router.resolve(to);
        console.log("guard matched: " + resolved.matched.length);
        console.log("guard path: " + resolved.path);
        console.log("guard name: " + (resolved.name as string));
        console.log("guard href: " + resolved.href);

        /*
         * route が登録済み。
         */
        if (resolved.matched.length > 0) {
            next();
            return;
        }

        /*
         * 無いのでnopageに遷移する。nopage は必ず登録されていなければならない。
         */
        next({path: nopagePath});
    }

    /**
     * VueRouter で画面遷移をする直前に呼ばれる共通hookの実装。
     * @param router VueRouterのインスタンスです
     * @param to 遷移先routeのインスタンスです
     * @param from 現在のrouteのインスタンスです
     * @param next 遷移を実行するために呼び出す関数です
     * @param noAuthPath
     */
    static async beforeRouteLeave(
        router: Router,
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext,
        noAuthPath: string
    ) {
        console.log(
            "RouterHooks#beforeRouteLeave: from " + from.path + " to " + to.path
        );
        console.log(" to.matched = " + JSON.stringify(to.matched));

        const isReload = to.matched.some(record => record.meta.reload);
        const goToNext = () => {
            /*
             * ここではページのリロードを行うかどうかのみチェックする。
             */
            if (isReload) {
                console.log(" reload!");
                window.location.href = to.path;
            } else {
                console.log(" next!");
                next();
            }
        }
        /*
         * Login check and Transit
         */
        if (to.matched.some(record => record.meta.authRequired)) {
            const authStore = useAuthenticationControllerStore();
            const restoreLoginDataCallback: RestoreLoginDataCallbackType = (
                loginInfo: LoginInfo | undefined,
                authRequired: boolean,
                restoreTransitData: boolean,
                transitTo: string
            ): void => {
                console.log("RouterHooks: Auth Restore callback: loginInfo = " + loginInfo + ", authRequired = " + authRequired);
                if (authRequired) {
                    if (!loginInfo || loginInfo.loginToken.length === 0) {
                        /* Not Authenticated */
                        console.log("RouterHooks: authRequired but authenticated");
                        window.location.href = noAuthPath;
                    }
                }
                goToNext();
            }
            const options: RestoreLoginDataOptions = {
                callback: restoreLoginDataCallback,
                authRequired: true,
                restoreTransitData: false,
                transitTo: ""
            }
            authStore.restore(options);
        } else {
            goToNext();
        }
    }
}
