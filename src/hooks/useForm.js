import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { submitStart, submitSuccess, submitFailure, resetForm } from '../features/ui/formSlice';
import { trackFormSubmit } from '../utils/analytics';

export const useForm = (submitAction) => {
    const dispatch = useDispatch();
    const { status, error } = useSelector((state) => state.form);

    // Using refs for uncontrolled inputs to prevent re-renders on every keystroke
    const refs = useRef({});

    const register = (name) => {
        return {
            name,
            ref: (el) => {
                refs.current[name] = el;
            },
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(submitStart());

        // Collect data from refs
        const formData = {};
        Object.keys(refs.current).forEach((key) => {
            if (refs.current[key]) {
                formData[key] = refs.current[key].value;
            }
        });

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // In a real app, you would call the API here
            // const response = await api.post('/contact', formData);

            dispatch(submitSuccess(formData));
            trackFormSubmit('contact_form');

            // Optional: Reset form
            // e.target.reset();
        } catch (err) {
            dispatch(submitFailure('Something went wrong. Please try again.'));
        }
    };

    const reset = () => {
        dispatch(resetForm());
    };

    return {
        register,
        handleSubmit,
        status,
        error,
        reset,
    };
};
