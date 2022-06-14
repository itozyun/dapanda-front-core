import { LooseRequired } from "@vue/shared";
import { ComponentPropsOptions } from "vue";
import { MenuItem } from "%/components/menu/MenuItem";

/**
 * コンポーネントのプロパティを定義するインタフェイスです
 */
export interface LeafMenuItemInterface {
    /**
     * コンポーネントのsubjectプロパティです
     */
    subject?: string;

    /**
     * コンポーネントのaliasプロパティです
     */
    alias?: string;

    /**
     * このノードに割り当てられるMenuItemを指定します。
     */
    menu: MenuItem;

    /**
     * ルートノードの場合はtrueを指定染ます。
     */
    root?: boolean;
}

/** propsの型を定義します */
export declare type LeafMenuItemProps = Readonly<LooseRequired<LeafMenuItemInterface>>;

/**
 * propsの定義です
 */
export const leafMenuItemProps: ComponentPropsOptions<LeafMenuItemInterface> = {
    subject: {
        default: "リーフメニューコンポーネント"
    },
    alias: {
        default: "リーフメニューコンポーネント"
    },
    menu: {
        required: true
    },
    root: {
        default: false
    }
};
