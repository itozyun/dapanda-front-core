import {ValidationSampleProps} from "%/samples/pages/ValidationSample/ValidationSampleProps";
import {inject, ref, SetupContext} from "vue";
import {useI18n} from "vue-i18n";

export const validationSampleSetup = (props: ValidationSampleProps, context: SetupContext) => {
    const { t } = useI18n();
    const title = ref(props.subject);

    const send = inject('send');

    const onSubmit = (values: any) => {
        console.log("Submitted : " + values);
    }
    return {
        t,
        title,
        onSubmit
    }
}
